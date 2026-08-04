'use client';

// QAWF · 步骤 4：测量结果

import type { Metrics, PersonForm } from '@/lib/types';

const fmt = (v: number | null, d = 0): string =>
  v == null || Number.isNaN(v) ? '--' : v.toFixed(d);

const ROWS: { key: keyof Metrics; label: string; desc: string; digits?: number }[] = [
  { key: 'hr', label: '心率 BPM', desc: '每分钟心跳次数，静息正常约 60–100' },
  { key: 'rr', label: '呼吸 /min', desc: '每分钟呼吸次数，成人正常约 12–20' },
  { key: 'spo2', label: '血氧 SpO2 %', desc: '血液氧饱和度，正常应 ≥ 95%' },
  { key: 'rmssd', label: 'RMSSD ms', desc: '副交感神经活性指标，反映放松与恢复能力，越高越好' },
  { key: 'lfhf', label: 'LF/HF', digits: 2, desc: '交感/副交感平衡比，偏高提示交感神经兴奋' },
  { key: 'si', label: 'SI 压力', desc: '压力指数，反映交感神经紧张程度，越高压力越大' },
  { key: 'fi', label: 'FI 疲劳', desc: '疲劳指数，越高表示身体越疲劳' },
  { key: 'mwi', label: 'MWI 认知', desc: '认知负荷指数，反映大脑专注与用脑程度' },
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
  //console.log(metrics,form)
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
            <p className="desc">{r.desc}</p>
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
