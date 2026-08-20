// QAWF · rPPG 核心算法：CHROM / POS / PCA / 融合

import { bandpassFFT, mean, std, zscore } from './dsp';

/** 逐通道时间均值归一化 */
export function normChannel(c: Float64Array): Float64Array {
  const m = mean(c) || 1;
  const out = new Float64Array(c.length);
  for (let i = 0; i < c.length; i++) out[i] = c[i] / m;
  return out;
}

/** CHROM（Chrominance，抗运动） */
export function chrom(rn: Float64Array, gn: Float64Array, bn: Float64Array, fs: number): Float64Array {
  const n = rn.length;
  const X = new Float64Array(n);
  const Y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    X[i] = 3 * rn[i] - 2 * gn[i];
    Y[i] = 1.5 * rn[i] + gn[i] - 1.5 * bn[i];
  }
  const Xf = bandpassFFT(X, fs, 0.7, 4);
  const Yf = bandpassFFT(Y, fs, 0.7, 4);
  const alpha = std(Xf) / (std(Yf) || 1) || 1;
  const S = new Float64Array(n);
  for (let i = 0; i < n; i++) S[i] = Xf[i] - alpha * Yf[i];
  return S;
}

/** POS（Plane-Orthogonal-to-Skin，抗肤色/光照） */
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
  return bandpassFFT(P, fs, 0.7, 4);
}

/**
 * POS overlap-add 滑窗版（Wang et al. 2017，QAWF v2）。
 * 逐窗（~1.6s）内做时间归一化 + 皮肤平面正交投影，去均值后重叠相加，
 * 相比整段 POS 对光照/肤色漂移更鲁棒。信号过短时退回整段 pos()。
 */
export function posOverlapAdd(
  rn: Float64Array,
  gn: Float64Array,
  bn: Float64Array,
  fs: number,
): Float64Array {
  const n = rn.length;
  const L = Math.max(8, Math.round(1.6 * fs)); // 窗长 ~1.6s
  if (n < L) return pos(rn, gn, bn, fs);
  const H = new Float64Array(n);
  const s1 = new Float64Array(L);
  const s2 = new Float64Array(L);
  for (let m = 0; m + L <= n; m++) {
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
    const a = std(s1) / (std(s2) || 1) || 1;
    // h = s1 + a·s2，去均值后 overlap-add
    let hm = 0;
    for (let i = 0; i < L; i++) hm += s1[i] + a * s2[i];
    hm /= L;
    for (let i = 0; i < L; i++) H[m + i] += s1[i] + a * s2[i] - hm;
  }
  return bandpassFFT(H, fs, 0.7, 4);
}

/** 3x3 对称矩阵雅可比特征分解，返回按特征值降序的特征向量 */
export function jacobiEigen(A: number[][]): { values: number[]; vectors: number[][] } {
  const a = A.map((r) => r.slice());
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let iter = 0; iter < 50; iter++) {
    let p = 0;
    let q = 1;
    let max = Math.abs(a[0][1]);
    if (Math.abs(a[0][2]) > max) { max = Math.abs(a[0][2]); p = 0; q = 2; }
    if (Math.abs(a[1][2]) > max) { max = Math.abs(a[1][2]); p = 1; q = 2; }
    if (max < 1e-9) break;
    const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
    const t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
    const c = 1 / Math.sqrt(t * t + 1);
    const s = t * c;
    for (let k = 0; k < 3; k++) {
      const akp = a[k][p];
      const akq = a[k][q];
      a[k][p] = c * akp - s * akq;
      a[k][q] = s * akp + c * akq;
    }
    for (let k = 0; k < 3; k++) {
      const apk = a[p][k];
      const aqk = a[q][k];
      a[p][k] = c * apk - s * aqk;
      a[q][k] = s * apk + c * aqk;
    }
    for (let k = 0; k < 3; k++) {
      const vkp = v[k][p];
      const vkq = v[k][q];
      v[k][p] = c * vkp - s * vkq;
      v[k][q] = s * vkp + c * vkq;
    }
  }
  const eig = [a[0][0], a[1][1], a[2][2]];
  const idx = [0, 1, 2].sort((i, j) => eig[j] - eig[i]);
  const vectors = idx.map((i) => [v[0][i], v[1][i], v[2][i]]);
  return { values: idx.map((i) => eig[i]), vectors };
}

/** PCA：取最大特征值主成分投影为脉搏信号 */
export function pca(rn: Float64Array, gn: Float64Array, bn: Float64Array, fs: number): Float64Array {
  const n = rn.length;
  const chans: Float64Array[] = [rn, gn, bn].map((c) => {
    const m = mean(c);
    const out = new Float64Array(c.length);
    for (let i = 0; i < c.length; i++) out[i] = c[i] - m;
    return out;
  });
  const cov: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let a = 0; a < 3; a++) {
    for (let b = 0; b < 3; b++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += chans[a][i] * chans[b][i];
      cov[a][b] = s / n;
    }
  }
  const { vectors } = jacobiEigen(cov);
  const pc = vectors[0];
  const S = new Float64Array(n);
  for (let i = 0; i < n; i++) S[i] = pc[0] * chans[0][i] + pc[1] * chans[1][i] + pc[2] * chans[2][i];
  return bandpassFFT(S, fs, 0.7, 4);
}

/** 相位对齐后融合（以第一路为参考，负相关则翻转，等权平均） */
export function fuse(signals: Float64Array[]): Float64Array {
  const ref = zscore(signals[0]);
  const acc = new Float64Array(ref.length);
  for (const sig of signals) {
    const z = zscore(sig);
    let corr = 0;
    for (let i = 0; i < z.length; i++) corr += z[i] * ref[i];
    const sign = corr < 0 ? -1 : 1;
    for (let i = 0; i < z.length; i++) acc[i] += sign * z[i];
  }
  for (let i = 0; i < acc.length; i++) acc[i] /= signals.length;
  return acc;
}
