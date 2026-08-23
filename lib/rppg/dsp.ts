// QAWF · 基础数字信号处理（DSP）
// 纯函数，无浏览器依赖，可在 Worker 或测试中运行。

export type Vec = Float64Array | number[];

export function mean(a: Vec): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i];
  return s / a.length;
}

export function std(a: Vec): number {
  const m = mean(a);
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - m) ** 2;
  return Math.sqrt(s / a.length);
}

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

/** 中位数 */
export function median(a: Vec): number {
  const n = a.length;
  if (!n) return 0;
  const arr = Array.from(a).sort((x, y) => x - y);
  return n % 2 ? arr[(n - 1) / 2] : (arr[n / 2 - 1] + arr[n / 2]) / 2;
}

/**
 * 运动伪影抑制：以 中位数 ± k·(1.4826·MAD) 截断离群样本（对运动尖峰稳健）。
 * @returns clean 截断后信号；clippedRatio 被截断样本占比（可用于下调信赖度）
 */
export function suppressArtifacts(sig: Float64Array, k = 4): { clean: Float64Array; clippedRatio: number } {
  const n = sig.length;
  if (n === 0) return { clean: sig, clippedRatio: 0 };
  const med = median(sig);
  const dev = new Float64Array(n);
  for (let i = 0; i < n; i++) dev[i] = Math.abs(sig[i] - med);
  const mad = median(dev) || 1;
  const lim = k * 1.4826 * mad; // 1.4826 使 MAD 对齐正态标准差
  const clean = new Float64Array(n);
  let clipped = 0;
  for (let i = 0; i < n; i++) {
    const d = sig[i] - med;
    if (d > lim) { clean[i] = med + lim; clipped++; }
    else if (d < -lim) { clean[i] = med - lim; clipped++; }
    else clean[i] = sig[i];
  }
  return { clean, clippedRatio: clipped / n };
}

/** 线性插值重采样到均匀网格 */
export function resample(t: number[], v: number[], fs: number): Float64Array {
  const t0 = t[0];
  const tN = t[t.length - 1];
  const n = Math.floor(((tN - t0) / 1000) * fs);
  const out = new Float64Array(Math.max(0, n));
  let j = 0;
  for (let i = 0; i < n; i++) {
    const tt = t0 + (i / fs) * 1000;
    while (j < t.length - 2 && t[j + 1] < tt) j++;
    const t1 = t[j];
    const t2 = t[j + 1];
    const frac = t2 > t1 ? (tt - t1) / (t2 - t1) : 0;
    out[i] = v[j] + (v[j + 1] - v[j]) * frac;
  }
  return out;
}

/** 去趋势：减去滑动平均，再零均值 */
export function detrend(sig: Float64Array, win: number): Float64Array {
  const n = sig.length;
  const out = new Float64Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += sig[i];
    if (i >= win) sum -= sig[i - win];
    const cnt = Math.min(i + 1, win);
    out[i] = sig[i] - sum / cnt;
  }
  const m = mean(out);
  for (let i = 0; i < n; i++) out[i] -= m;
  return out;
}

/** z-score 标准化 */
export function zscore(sig: Vec): Float64Array {
  const m = mean(sig);
  const s = std(sig) || 1;
  const out = new Float64Array(sig.length);
  for (let i = 0; i < sig.length; i++) out[i] = (sig[i] - m) / s;
  return out;
}

export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/** 迭代基-2 Cooley-Tukey FFT（就地） */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cwr = 1;
      let cwi = 0;
      for (let k = 0; k < len / 2; k++) {
        const half = i + k + len / 2;
        const vr = re[half] * cwr - im[half] * cwi;
        const vi = re[half] * cwi + im[half] * cwr;
        const ur = re[i + k];
        const ui = im[i + k];
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[half] = ur - vr;
        im[half] = ui - vi;
        const nwr = cwr * wr - cwi * wi;
        cwi = cwr * wi + cwi * wr;
        cwr = nwr;
      }
    }
  }
}

export function ifft(re: Float64Array, im: Float64Array): void {
  for (let i = 0; i < im.length; i++) im[i] = -im[i];
  fft(re, im);
  const n = re.length;
  for (let i = 0; i < n; i++) {
    re[i] /= n;
    im[i] = -im[i] / n;
  }
}

/**
 * FFT 域带通滤波：升余弦过渡带（宽 trans Hz）+ 可选 Wiener 软增益。
 * 理想砖墙（0/1）增益等效于时域与 sinc 卷积，产生吉布斯振铃，
 * 会扭曲脉搏波形态（尤其信号两端）并扰动峰位时序；平滑滚降可基本消除。
 */
export function bandpassFFT(
  sig: Float64Array,
  fs: number,
  low: number,
  high: number,
  trans = 0.25,
  wiener = false,
): Float64Array {
  const n = nextPow2(sig.length);
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  const m = mean(sig);
  for (let i = 0; i < sig.length; i++) re[i] = sig[i] - m;
  fft(re, im);

  let peakP = 0;
  if (wiener) {
    for (let k = 0; k < n / 2; k++) {
      const f = (k * fs) / n;
      const p = re[k] * re[k] + im[k] * im[k];
      if (f >= low && f <= high && p > peakP) peakP = p;
    }
  }

  const gainAt = (f: number): number => {
    if (f < low - trans || f > high + trans) return 0;
    if (f >= low && f <= high) return 1;
    const d = f < low ? (low - f) / trans : (f - high) / trans;
    return 0.5 * (1 + Math.cos(Math.PI * d));
  };

  for (let k = 0; k <= n / 2; k++) {
    const f = (k * fs) / n;
    const mk = n - k;
    let gain = gainAt(f);
    if (gain && wiener && peakP > 0) {
      const p = re[k] * re[k] + im[k] * im[k];
      const snr = p / (peakP * 0.05 + 1e-9);
      gain *= snr / (snr + 1);
    }
    re[k] *= gain;
    im[k] *= gain;
    if (mk < n && mk !== k) {
      re[mk] *= gain;
      im[mk] *= gain;
    }
  }
  ifft(re, im);
  return re.subarray(0, sig.length);
}

/** 求带内主频(Hz)与频谱纯度(0~1) */
export function dominantFreq(
  sig: Float64Array,
  fs: number,
  low: number,
  high: number,
): { freq: number; purity: number } {
  const n = nextPow2(sig.length);
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  const m = mean(sig);
  for (let i = 0; i < sig.length; i++) re[i] = sig[i] - m;
  fft(re, im);
  let peakK = -1;
  let peakP = 0;
  let bandP = 0;
  for (let k = 1; k < n / 2; k++) {
    const f = (k * fs) / n;
    if (f < low || f > high) continue;
    const p = re[k] * re[k] + im[k] * im[k];
    bandP += p;
    if (p > peakP) {
      peakP = p;
      peakK = k;
    }
  }
  if (peakK < 0) return { freq: 0, purity: 0 };
  // 抛物线插值亚-bin 频率：短窗下 bin 量化可达 3+ bpm，直接取整峰是 HR 跳变的主因之一
  let freq = (peakK * fs) / n;
  if (peakK > 1 && peakK < n / 2 - 1) {
    const pAt = (k: number) => re[k] * re[k] + im[k] * im[k];
    const p0 = pAt(peakK - 1);
    const p2 = pAt(peakK + 1);
    const denom = p0 - 2 * peakP + p2;
    if (denom < 0) {
      const delta = clamp((0.5 * (p0 - p2)) / denom, -0.5, 0.5);
      freq = ((peakK + delta) * fs) / n;
    }
  }
  return { freq, purity: bandP > 0 ? peakP / bandP : 0 };
}
