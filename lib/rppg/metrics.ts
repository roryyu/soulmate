// QAWF · 8 指标计算与主分析入口

import { clamp, detrend, dominantFreq, fft, mean, median, nextPow2, resample, std, suppressArtifacts, zscore } from './dsp';
import { chrom, fuse, normChannel, posOverlapAdd, PULSE_BAND } from './algorithms';
import { EMPTY_METRICS, type Metrics } from '../types';

const FS = 30; // 重采样目标频率 Hz

/** 基线与门控参数集中一处，便于后续用对照设备标定 */
export const CONFIG = {
  peak: { minDistRatio: 0.6, localWinSec: 2.5, threshK: 0.35 },
  ibi: { minMs: 300, maxMs: 1800, medianWin: 5, tol: 0.25, maxRejectRatio: 0.4 },
  gate: { rmssdSec: 30, rmssdPairs: 15, siSec: 60, siBeats: 20, lfhfSec: 60, lfhfBeats: 20, fiSec: 60 },
  hr: { mean: 70, sd: 12, emaAlpha: 0.4, maxStep: 10 },
  // 以下 RMSSD / LF-HF 基线取自 实测分布，不是 ECG 临床值。
  // 峰时序抖动会把 RMSSD 抬高 1.2–3.2 倍（随 SNR 变化）；若照搬 ECG 基线
  // （ln40 ≈ 3.7），几乎所有测量都会被判成"HRV 极高"，把 FI/MWI 恒压在低端。
  // 合成信号实测：真值 RMSSD≈42ms 时读数落在 50（高 SNR）–135ms（典型 SNR），
  // 几何中心 ≈82ms → ln ≈ 4.4；sd 放宽到 0.65 以容纳 SNR 带来的额外散布。
  lnRmssd: { mean: 4.4, sd: 0.65 },
  lnLfhf: { mean: 0.18, sd: 0.7 },
  fi: { wHr: 0.5, wRmssd: 0.7, gain: 0.9 },
  mwi: { wLfhf: 0.6, wRmssd: 0.5, gain: 0.9 },
};

/**
 * 跨帧心率跟踪状态。Worker 每会话单实例；duration 回退或过小视为新会话并复位。
 * 旧版每次调用都独立估计心率（无插值、无记忆），是 1.5s 刷新下指数频繁跳动的直接原因。
 */
const hrState: { value: number | null; duration: number } = { value: null, duration: 0 };

/** 抛物线插值求亚样本峰位：30Hz 下单样本量化即 33ms，直接取整会污染 RMSSD */
function refinePeak(sig: Float64Array, i: number): number {
  const d = sig[i - 1] - 2 * sig[i] + sig[i + 1];
  if (d === 0) return i;
  return i + clamp((0.5 * (sig[i - 1] - sig[i + 1])) / d, -0.5, 0.5);
}

/**
 * 峰值检测：HR 先验定最小峰间距 + 局部自适应阈值 + 亚样本插值。
 * @param hrHint FFT 主频给出的心率先验（BPM），0 表示无先验
 * @returns 峰位置（分数索引，单位=样本）
 */
export function findPeaks(sig: Float64Array, fs: number, hrHint = 0): number[] {
  const n = sig.length;
  if (n < 3) return [];
  // 有先验时按 0.6×预期周期设间距，可排除二次波（收缩期后 ~0.2s 的次峰）
  const period = hrHint > 0 ? (fs * 60) / hrHint : 0;
  const minDist = Math.max(
    2,
    Math.round(period > 0 ? period * CONFIG.peak.minDistRatio : (fs * 60) / 220),
  );
  // 局部均值/方差前缀和：长录制里全局阈值会被整体幅度漂移带偏
  const win = Math.max(minDist * 2 + 1, Math.round(fs * CONFIG.peak.localWinSec));
  const half = win >> 1;
  const c1 = new Float64Array(n + 1);
  const c2 = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    c1[i + 1] = c1[i] + sig[i];
    c2[i + 1] = c2[i] + sig[i] * sig[i];
  }
  const localThr = (i: number): number => {
    const a = Math.max(0, i - half);
    const b = Math.min(n, i + half + 1);
    const cnt = b - a;
    const m = (c1[b] - c1[a]) / cnt;
    const v = Math.max(0, (c2[b] - c2[a]) / cnt - m * m);
    return m + CONFIG.peak.threshK * Math.sqrt(v);
  };

  const pos: number[] = [];
  const val: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    if (!(sig[i] > sig[i - 1] && sig[i] >= sig[i + 1])) continue;
    if (sig[i] <= localThr(i)) continue;
    if (pos.length && i - pos[pos.length - 1] < minDist) {
      // 间距不足：保留更高的那个峰，抑制二次波与噪声毛刺
      if (sig[i] > val[val.length - 1]) {
        pos[pos.length - 1] = i;
        val[val.length - 1] = sig[i];
      }
      continue;
    }
    pos.push(i);
    val.push(sig[i]);
  }
  return pos.map((i) => refinePeak(sig, i));
}

/** IBI 序列（带时间戳与"是否与前一拍相邻"标记，供 RMSSD/LF-HF 用） */
export interface IbiSeries {
  vals: number[];      // 保留下来的 IBI(ms)
  times: number[];     // 每个 IBI 的结束时刻(s)，与 vals 一一对应
  adjacent: boolean[]; // vals[i] 是否与 vals[i-1] 在原序列中相邻（用于 RMSSD 求和）
  rejectRatio: number; // 因超出生理范围或偏离局部中位数被剔除的比例
}

/**
 * 峰位置 → IBI 序列：先按生理范围过滤，再做迭代中位数校正剔除运动/漏拍/双计带来的离群值。
 * 剔除比例过高时可用于 UI 侧下调可信度或直接置 null。
 */
export function toIbiSeries(peaks: number[], fs: number): IbiSeries {
  const raw: { v: number; t: number }[] = [];
  for (let i = 1; i < peaks.length; i++) {
    const d = ((peaks[i] - peaks[i - 1]) / fs) * 1000;
    if (d >= CONFIG.ibi.minMs && d <= CONFIG.ibi.maxMs) {
      raw.push({ v: d, t: peaks[i] / fs });
    }
  }
  let kept = raw.slice();
  for (let iter = 0; iter < 2; iter++) {
    const next: typeof raw = [];
    const w = CONFIG.ibi.medianWin;
    for (let i = 0; i < kept.length; i++) {
      const a = Math.max(0, i - w);
      const b = Math.min(kept.length, i + w + 1);
      const local = kept.slice(a, b).map((x) => x.v);
      const med = median(local) || kept[i].v;
      if (Math.abs(kept[i].v - med) / med <= CONFIG.ibi.tol) next.push(kept[i]);
    }
    if (next.length === kept.length) { kept = next; break; }
    kept = next;
  }
  const rejectRatio = raw.length ? 1 - kept.length / raw.length : 0;
  const vals = kept.map((x) => x.v);
  const times = kept.map((x) => x.t);
  const adjacent = kept.map((x, i) =>
    i === 0 ? false : Math.abs(times[i] - times[i - 1] - x.v / 1000) < 0.01,
  );
  return { vals, times, adjacent, rejectRatio };
}

/**
 * RMSSD 时域 HRV：只求"原序列中相邻"的两拍差，避免剔除位置产生假差异。
 *
 * 注意：相机采样的峰时序抖动会系统性抬高 RMSSD（30fps 采样下约 +19%，15fps 下可达 3 倍）。
 * 抖动在相邻拍间是相关的（带通平滑了波形），不满足白噪假设，故无法用
 * RMSSD² − 2σ² 之类的公式反解。降低抖动只能靠提高采样率，见 useMeasurement 的
 * FRAME_SEND_INTERVAL_MS。此处返回的是实测值，偏高，趋势可用、绝对值勿作临床解读。
 */
export function rmssd(ibi: IbiSeries): number | null {
  let s = 0;
  let n = 0;
  for (let i = 1; i < ibi.vals.length; i++) {
    if (!ibi.adjacent[i]) continue;
    s += (ibi.vals[i] - ibi.vals[i - 1]) ** 2;
    n++;
  }
  if (n < CONFIG.gate.rmssdPairs) return null;
  return Math.sqrt(s / n);
}

/** LF/HF 频域 HRV：按真实搏动时刻插值 tachogram（剔除造成的时间缺口由插值跨过） */
export function lfhf(ibi: IbiSeries): number | null {
  const { vals, times } = ibi;
  if (vals.length < CONFIG.gate.lfhfBeats) return null;
  const fsT = 4;
  const dur = times[times.length - 1] - times[0];
  const n = Math.floor(dur * fsT);
  if (n < 64) return null;
  const rs = new Float64Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const tt = times[0] + i / fsT;
    while (j < times.length - 2 && times[j + 1] < tt) j++;
    const t1 = times[j];
    const t2 = times[j + 1];
    const frac = t2 > t1 ? (tt - t1) / (t2 - t1) : 0;
    rs[i] = vals[j] + (vals[j + 1] - vals[j]) * frac;
  }
  const d = detrend(rs, Math.min(n, Math.round(fsT * 30))); // 去 <0.033Hz 慢漂移，不吃 LF 下沿
  const N = nextPow2(n);
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  for (let i = 0; i < n; i++) {
    const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1))); // 抑制谱泄漏
    re[i] = d[i] * hann;
  }
  fft(re, im);
  let lf = 0;
  let hf = 0;
  for (let k = 1; k < N / 2; k++) {
    const f = (k * fsT) / N;
    const p = re[k] * re[k] + im[k] * im[k];
    if (f >= 0.04 && f < 0.15) lf += p;
    else if (f >= 0.15 && f < 0.4) hf += p;
  }
  return hf > 0 ? lf / hf : null;
}

/** Baevsky 应激指数 SI = AMo / (2·Mo·MxDMn) */
export function stressIndex(ibi: IbiSeries): number | null {
  const v = ibi.vals;
  if (v.length < CONFIG.gate.siBeats) return null;
  const binMs = 50;
  const bins: Record<number, number> = {};
  let min = Infinity;
  let max = -Infinity;
  for (const x of v) {
    const key = Math.round(x / binMs) * binMs;
    bins[key] = (bins[key] || 0) + 1;
    if (x < min) min = x;
    if (x > max) max = x;
  }
  let modeKey = 0;
  let modeCount = 0;
  for (const k in bins) {
    if (bins[k] > modeCount) {
      modeCount = bins[k];
      modeKey = Number(k);
    }
  }
  const Mo = modeKey / 1000;
  const AMo = (modeCount / v.length) * 100;
  const MxDMn = (max - min) / 1000;
  if (Mo <= 0 || MxDMn <= 0) return null;
  return AMo / (2 * Mo * MxDMn);
}

/** 有界 S 形映射：把加权 z 分数压到 0–100，两端渐近而不硬钳 */
const sigmoid01 = (x: number): number => 100 / (1 + Math.exp(-x));

/**
 * FI 疲劳指数（启发式 0–100）。
 * 用 z 分数 + sigmoid 取代原线性式：原式在 RMSSD 偏离基线较多时算出负数被 clamp 成 0，
 * 失去分辨力。RMSSD 近似对数正态，故对 ln(RMSSD) 做标准化。
 */
export function fatigueIndex(hr: number, rmssdMs: number): number | null {
  if (!(hr > 0) || !(rmssdMs > 0)) return null;
  const zHr = (hr - CONFIG.hr.mean) / CONFIG.hr.sd;
  const zLn = (Math.log(rmssdMs) - CONFIG.lnRmssd.mean) / CONFIG.lnRmssd.sd;
  // 疲劳随静息心率上升、副交感活性(RMSSD)下降而增大
  const drive = CONFIG.fi.wHr * zHr - CONFIG.fi.wRmssd * zLn;
  return clamp(sigmoid01(CONFIG.fi.gain * drive), 1, 99);
}

/**
 * MWI 认知负荷（启发式 0–100）。
 * 随交感占优(LF/HF↑)与 HRV 抑制而增大；LF/HF 亦近似对数正态，取 ln 后标准化。
 */
export function workloadIndex(lfhfRatio: number, rmssdMs: number): number | null {
  if (!(lfhfRatio > 0) || !(rmssdMs > 0)) return null;
  const zL = (Math.log(lfhfRatio) - CONFIG.lnLfhf.mean) / CONFIG.lnLfhf.sd;
  const zR = (Math.log(rmssdMs) - CONFIG.lnRmssd.mean) / CONFIG.lnRmssd.sd;
  const drive = CONFIG.mwi.wLfhf * zL - CONFIG.mwi.wRmssd * zR;
  return clamp(sigmoid01(CONFIG.mwi.gain * drive), 1, 99);
}

/**
 * 主分析：非均匀采样 RGB → 8 指标
 * @param t 时间戳(ms)  @param duration 累计时长(s)  @param motion 近期运动强度 0-1
 */
export function analyze(
  t: number[],
  r: number[],
  g: number[],
  b: number[],
  duration: number,
  motion = 0,
): Metrics {
  const out: Metrics = { ...EMPTY_METRICS, waveform: [] };
  out.motion = clamp(motion * 100, 0, 100);
  if (t.length < 64) return out;

  // 1. 重采样到均匀网格（用真实时间轴，HRV 精度的关键）
  let R = resample(t, r, FS);
  let G = resample(t, g, FS);
  let B = resample(t, b, FS);
  if (R.length < 64) return out;

  // 2. 运动伪影抑制（逐通道 MAD 截断），截断比例用于下调信赖度
  const sr = suppressArtifacts(R);
  const sg = suppressArtifacts(G);
  const sb = suppressArtifacts(B);
  R = sr.clean; G = sg.clean; B = sb.clean;
  const clipped = Math.max(sr.clippedRatio, sg.clippedRatio, sb.clippedRatio);

  // 3. 去趋势（窗 ~1.5s），仅用于 RR 与 SpO2
  const win = Math.floor(FS * 1.5);
  const Rd = detrend(R, win);
  const Gd = detrend(G, win);
  const Bd = detrend(B, win);

  // 4. 双算法脉搏提取（带通已含于算法内）：POS 主 + CHROM 备，按谱纯度²加权融合。
  //    POS 是光照变化下最强经典基线（Wang et al. 2017 TBME）；权重²让干净信号主导，
  //    替代旧版等权三路（含 PCA）融合——PCA 主成分常跟踪运动/光照而非脉搏，稀释信噪比。
  const { low, high, trans } = PULSE_BAND;
  const rn = normChannel(R);
  const gn = normChannel(G);
  const bn = normChannel(B);
  const sPos = posOverlapAdd(rn, gn, bn, FS);
  const sChrom = chrom(rn, gn, bn, FS);
  const purPos = dominantFreq(sPos, FS, low, high).purity;
  const purChrom = dominantFreq(sChrom, FS, low, high).purity;
  const pulse = fuse([sPos, sChrom], [purPos * purPos, purChrom * purChrom]);

  // 5. 心率跟踪：新会话复位；峰检测先验用上一帧跟踪值（比当帧瞬时主频更稳）
  if (duration < hrState.duration || duration < 6) hrState.value = null;
  hrState.duration = duration;
  const hrDom = dominantFreq(pulse, FS, low, high);
  let hrNew: number | null = hrDom.freq > 0 ? hrDom.freq * 60 : null;
  const peaks = findPeaks(pulse, FS, hrState.value ?? hrNew ?? 0);
  out.beats = peaks.length;
  const ibi = toIbiSeries(peaks, FS);

  // 6. FFT 主频（已抛物线插值）与 IBI 中位数互校验，再跨帧 EMA + 步长钳制
  if (ibi.vals.length >= 5) {
    const hrIbi = 60000 / median(ibi.vals);
    if (hrNew == null) hrNew = hrIbi;
    else if (Math.abs(hrIbi - hrNew) <= 8) hrNew = (hrNew + hrIbi) / 2; // 一致：取均值提高精度
    else if (hrState.value != null && Math.abs(hrIbi - hrState.value) < Math.abs(hrNew - hrState.value)) {
      hrNew = hrIbi; // 主频跳到谐波/干扰频：取更贴近跟踪值的一路
    }
  }
  if (hrNew != null) {
    if (hrState.value == null) hrState.value = hrNew;
    else {
      const c = clamp(hrNew, hrState.value - CONFIG.hr.maxStep, hrState.value + CONFIG.hr.maxStep);
      hrState.value = (1 - CONFIG.hr.emaAlpha) * hrState.value + CONFIG.hr.emaAlpha * c;
    }
    out.hr = hrState.value;
  }
  const motionPenalty = clamp(1 - motion, 0.3, 1);
  const artifactPenalty = clamp(1 - clipped * 2, 0.3, 1);
  out.confidence = clamp(hrDom.purity * 140 * motionPenalty * artifactPenalty, 0, 99);
  const ibiUsable = ibi.rejectRatio <= CONFIG.ibi.maxRejectRatio;

  if (ibiUsable && duration >= CONFIG.gate.rmssdSec) out.rmssd = rmssd(ibi);

  // 7. 呼吸（绿通道去趋势信号 0.1–0.5Hz 主频）
  const rrDom = dominantFreq(Gd, FS, 0.1, 0.5);
  if (rrDom.freq > 0) out.rr = rrDom.freq * 60;

  // 8. SpO2（实验性：红/蓝 AC-DC 比值比）
  const acR = std(Rd);
  const dcR = mean(R) || 1;
  const acB = std(Bd);
  const dcB = mean(B) || 1;
  const ratio = acR / dcR / (acB / dcB || 1e-6);
  if (isFinite(ratio) && ratio > 0) out.spo2 = clamp(104 - 5 * ratio, 90, 100);

  // 9. 长时长门控的频域/复合指标
  if (ibiUsable && duration >= CONFIG.gate.siSec) out.si = stressIndex(ibi);
  if (ibiUsable && duration >= CONFIG.gate.lfhfSec) out.lfhf = lfhf(ibi);
  // FI 只依赖 HR + RMSSD，60s 即可出数；MWI 依赖 LF/HF，随其门控
  if (duration >= CONFIG.gate.fiSec && out.hr != null && out.rmssd != null) {
    out.fi = fatigueIndex(out.hr, out.rmssd);
  }
  if (out.lfhf != null && out.rmssd != null) {
    out.mwi = workloadIndex(out.lfhf, out.rmssd);
  }

  // 10. 波形（最近 ~5s 归一化脉搏）
  const tail = pulse.subarray(Math.max(0, pulse.length - FS * 5));
  out.waveform = Array.from(zscore(tail));

  return out;
}
