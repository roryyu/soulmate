'use client';

// QAWF · 步骤 4：测量结果

import type { Metrics, PersonForm } from '@/lib/types';

const fmt = (v: number | null, d = 0): string =>
  v == null || Number.isNaN(v) ? '--' : v.toFixed(d);

const ROWS: { key: keyof Metrics; label: string; digits?: number }[] = [
  { key: 'hr', label: '心率 BPM' },
  { key: 'rr', label: '呼吸 /min' },
  { key: 'spo2', label: '血氧 SpO2 %' },
  { key: 'rmssd', label: 'RMSSD ms' },
  { key: 'lfhf', label: 'LF/HF', digits: 2 },
  { key: 'si', label: 'SI 压力' },
  { key: 'fi', label: 'FI 疲劳' },
  { key: 'mwi', label: 'MWI 认知' },
];

export default function ResultScreen({
  metrics,
  form,
  duration,
  onRestart,
}: {
  metrics: Metrics;
  form: PersonForm | null;
  duration: number;
  onRestart: () => void;
}) {
  return (
    <section className="card">
      <h2 className="sec-title">测量结果</h2>
      <div className="result-head">
        {form?.name || '—'} · 时长 <b>{duration.toFixed(0)}</b>s · 平均信赖度{' '}
        <b>{fmt(metrics.confidence)}</b>%
      </div>
      <div className="metrics">
        {ROWS.map((r) => (
          <div className="m" key={r.key}>
            <b>{fmt(metrics[r.key] as number | null, r.digits ?? 0)}</b>
            <span>{r.label}</span>
          </div>
        ))}
      </div>
      <div className="btn-row">
        <button className="btn primary" onClick={onRestart}>
          重新测量
        </button>
      </div>
      <p className="disclaimer">⚠️ 结果仅供健康参考，不能替代专业医疗诊断。</p>
    </section>
  );
}
