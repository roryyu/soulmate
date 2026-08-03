// QAWF · rPPG Web Worker（由 Next.js/webpack 本地打包，无远程脚本）
// 接收 AnalyzeRequest，返回 MetricsResponse。

import { analyze } from './metrics';
import { EMPTY_METRICS, type AnalyzeRequest, type MetricsResponse } from '../types';

const ctx = self as unknown as Worker;

ctx.onmessage = (e: MessageEvent<AnalyzeRequest>) => {
  const d = e.data;
  if (!d || d.type !== 'analyze') return;
  let metrics;
  try {
    metrics = analyze(d.t, d.r, d.g, d.b, d.duration, d.motion ?? 0);
  } catch {
    metrics = { ...EMPTY_METRICS };
  }
  const res: MetricsResponse = { type: 'metrics', metrics, final: d.final };
  ctx.postMessage(res);
};
