'use client';

// QAWF · 步骤 4：测量结果

import type { Metrics, PersonForm } from '@/lib/types';

const fmt = (v: number | null, d = 0): string =>
  v == null || Number.isNaN(v) ? '--' : v.toFixed(d);

const ROWS: { key: keyof Metrics; label: string; desc: string; digits?: number }[] = [
  { key: 'hr', label: '心率 BPM', desc: '每分钟心跳次数，静息正常约 60–100，运动员可低至 40–60' },
  { key: 'rr', label: '呼吸 /min', desc: '每分钟呼吸次数，成人正常约 12–20' },
  { key: 'spo2', label: '血氧 SpO2 %', desc: '血液氧饱和度，正常 ≥95%，90–94% 偏低，<90% 需警惕（实验性指标）' },
  { key: 'rmssd', label: 'RMSSD ms', desc: '副交感活性，越高越放松；成人常见 20–100，随年龄下降，摄像头读数偏高、看趋势' },
  { key: 'lfhf', label: 'LF/HF', digits: 2, desc: '交感/副交感平衡比，静息正常约 0.5–2，>2 提示交感占优' },
  { key: 'si', label: 'SI 压力', desc: '压力指数，正常约 75–125，125–200 轻度应激，>200 压力明显（摄像头读数偏高、看趋势）' },
  { key: 'fi', label: 'FI 疲劳', desc: '疲劳指数 0–100，<30 状态良好，30–60 中度疲劳，>60 明显疲劳' },
  { key: 'mwi', label: 'MWI 认知', desc: '认知负荷 0–100，<30 放松，30–60 适度专注，>60 负荷偏高' },
];

export default function ResultScreen({
  metrics,
  form,
  duration,
  musicUrl,
  musicLoading,
  onRestart,
}: {
  metrics: Metrics;
  form: PersonForm | null;
  duration: number;
  musicUrl?: string;
  musicLoading?: boolean;
  onRestart: () => void;
}) {
  console.log(metrics,form)
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
      {musicLoading && <p className="music-tip">正在为你生成专属音乐…</p>}
      {musicUrl && (
        <div className="music">
          <h2 className="sec-title">为你生成的音乐</h2>
          <audio controls src={musicUrl} />
        </div>
      )}
      <div className="btn-row">
        <button className="btn primary" onClick={onRestart}>
          重新测量
        </button>
      </div>
      <p className="disclaimer">⚠️ 结果仅供健康参考，不能替代专业医疗诊断。</p>
    </section>
  );
}
