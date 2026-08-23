// QAWF · 核心算法：CHROM / POS（Wang et al. 2017）/ 谱纯度加权融合

import { bandpassFFT, mean, std, zscore } from './dsp';

/**
 * 统一脉搏带（Hz）：≈45–210 bpm。
 * 比参考实现 0.7–2.5Hz（de Haan / McDuff iphys-toolbox）略宽以耐受极端心率，
 * 但显著窄于旧版 0.7–4Hz——4Hz 上沿会把谐波与高频噪声放进融合信号，抬高抖动。
 */
export const PULSE_BAND = { low: 0.75, high: 3.5, trans: 0.25 };

/** 逐通道时间均值归一化 */
export function normChannel(c: Float64Array): Float64Array {
  const m = mean(c) || 1;
  const out = new Float64Array(c.length);
  for (let i = 0; i < c.length; i++) out[i] = c[i] / m;
  return out;
}

/** CHROM（Chrominance，de Haan & Jeanne 2013；X/Y 先带通再加权组合，与参考一致） */
export function chrom(rn: Float64Array, gn: Float64Array, bn: Float64Array, fs: number): Float64Array {
  const n = rn.length;
  const X = new Float64Array(n);
  const Y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    X[i] = 3 * rn[i] - 2 * gn[i];
    Y[i] = 1.5 * rn[i] + gn[i] - 1.5 * bn[i];
  }
  const { low, high, trans } = PULSE_BAND;
  const Xf = bandpassFFT(X, fs, low, high, trans);
  const Yf = bandpassFFT(Y, fs, low, high, trans);
  const alpha = std(Xf) / (std(Yf) || 1) || 1;
  const S = new Float64Array(n);
  for (let i = 0; i < n; i++) S[i] = Xf[i] - alpha * Yf[i];
  return S;
}

/** POS（Plane-Orthogonal-to-Skin，整段版；信号过短时的回退） */
export function pos(rn: Float64Array, gn: Float64Array, bn: Float64Array, fs: number): Float64Array {
  const n = rn.length;
  const h1 = new Float64Array(n);
  const h2 = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    h1[i] = gn[i] - bn[i];
    h2[i] = -2 * rn[i] + gn[i] + bn[i];
  }
  const alpha = std(h1) / (std(h2) || 1) || 1;
  const P = new Float64Array(n);
  for (let i = 0; i < n; i++) P[i] = h1[i] + alpha * h2[i];
  const { low, high, trans } = PULSE_BAND;
  return bandpassFFT(P, fs, low, high, trans);
}

/**
 * POS overlap-add 滑窗版（对齐 Wang et al. 2017 TBME 参考实现，QAWF v3）。
 * 逐窗（~1.6s）时间归一化 + 皮肤平面正交投影，对光照/肤色漂移鲁棒。
 * 相对 v2 的关键修正（v2 的缺陷正是波形幅度调制 → 峰位抖动 → 指数波动）：
 *  1) Hann 加权重叠相加并除以覆盖权重：消除窗接缝与信号两端衰减；
 *  2) 窗间 α 用 EMA 平滑：48 样本估出的 std 比值噪声很大，逐窗独立取 α
 *     会直接调幅重建波形；
 *  3) 步长 1 → L/4：计算量降约 4 倍，且每样本仍被 ~4 个窗覆盖。
 */
export function posOverlapAdd(
  rn: Float64Array,
  gn: Float64Array,
  bn: Float64Array,
  fs: number,
): Float64Array {
  const n = rn.length;
  const L = Math.max(8, Math.round(1.6 * fs)); // 窗长 ~1.6s（参考实现同值）
  if (n < L) return pos(rn, gn, bn, fs);
  const stride = Math.max(1, Math.round(L / 4));
  const hann = new Float64Array(L);
  for (let i = 0; i < L; i++) hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / L));
  const acc = new Float64Array(n);
  const cov = new Float64Array(n);
  const s1 = new Float64Array(L);
  const s2 = new Float64Array(L);
  let alphaEma = -1;
  for (let m = 0; m + L <= n; m += stride) {
    // 窗内逐通道时间归一化（除以窗内均值）
    let mr = 0, mg = 0, mb = 0;
    for (let i = 0; i < L; i++) { mr += rn[m + i]; mg += gn[m + i]; mb += bn[m + i]; }
    mr = mr / L || 1; mg = mg / L || 1; mb = mb / L || 1;
    for (let i = 0; i < L; i++) {
      const r = rn[m + i] / mr;
      const g = gn[m + i] / mg;
      const b = bn[m + i] / mb;
      s1[i] = g - b;           // 投影 [0, 1, -1]
      s2[i] = -2 * r + g + b;  // 投影 [-2, 1, 1]
    }
    const aRaw = std(s1) / (std(s2) || 1) || 1;
    alphaEma = alphaEma < 0 ? aRaw : 0.7 * alphaEma + 0.3 * aRaw;
    // h = s1 + α·s2，去均值后 Hann 加权 overlap-add
    let hm = 0;
    for (let i = 0; i < L; i++) hm += s1[i] + alphaEma * s2[i];
    hm /= L;
    for (let i = 0; i < L; i++) {
      acc[m + i] += hann[i] * (s1[i] + alphaEma * s2[i] - hm);
      cov[m + i] += hann[i];
    }
  }
  const H = new Float64Array(n);
  for (let i = 0; i < n; i++) H[i] = cov[i] > 1e-9 ? acc[i] / cov[i] : 0;
  const { low, high, trans } = PULSE_BAND;
  return bandpassFFT(H, fs, low, high, trans);
}

/**
 * 相位对齐加权融合：以权重最大者为参考，负相关翻转后加权平均。
 * 权重建议取谱纯度²：让干净信号主导，避免劣质信号（如运动期的次优算法）
 * 以等权稀释整体信噪比——等权融合是旧版指标波动的重要来源。
 */
export function fuse(signals: Float64Array[], weights?: number[]): Float64Array {
  const w = weights && weights.length === signals.length ? weights.slice() : signals.map(() => 1);
  let refIdx = 0;
  for (let i = 1; i < w.length; i++) if (w[i] > w[refIdx]) refIdx = i;
  const ref = zscore(signals[refIdx]);
  const acc = new Float64Array(ref.length);
  let wsum = 0;
  for (let k = 0; k < signals.length; k++) {
    const z = zscore(signals[k]);
    let corr = 0;
    for (let i = 0; i < z.length; i++) corr += z[i] * ref[i];
    const sign = corr < 0 ? -1 : 1;
    for (let i = 0; i < z.length; i++) acc[i] += sign * w[k] * z[i];
    wsum += w[k];
  }
  const norm = wsum || 1;
  for (let i = 0; i < acc.length; i++) acc[i] /= norm;
  return acc;
}
