'use client';

// METRICS · 8 指标卡片网格

import type { Metrics } from '@/lib/types';

const fmt = (v: number | null, d = 0): string =>
  v == null || Number.isNaN(v) ? '--' : v.toFixed(d);

const CARDS: { key: keyof Metrics; label: string; digits?: number }[] = [
  { key: 'hr', label: '心率 BPM' },
  { key: 'rr', label: '呼吸 /min' },
  { key: 'spo2', label: '血氧 SpO2 %' },
  { key: 'rmssd', label: 'RMSSD ms' },
  { key: 'lfhf', label: 'LF/HF (≥2min)', digits: 2 },
  { key: 'si', label: 'SI 压力 (≥2min)' },
  { key: 'fi', label: 'FI 疲劳 (≥1min)' },
  { key: 'mwi', label: 'MWI 认知 (≥2min)' },
];

export default function MetricGrid({ metrics }: { metrics: Metrics }) {
  return (
    <div className="metrics">
      {CARDS.map((c) => (
        <div className="m" key={c.key}>
          <b>{fmt(metrics[c.key] as number | null, c.digits ?? 0)}</b>
          <span>{c.label}</span>
        </div>
      ))}
    </div>
  );
}
