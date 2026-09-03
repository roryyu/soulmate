'use client';

// METRICS · 步骤 6：情绪健康报告（有屿 SOULMATES 长页式报告）

import { useEffect, useState } from 'react';
import type { Metrics, PersonForm, ReportInsights } from '@/lib/types';
import type { ResultPacket } from '@/components/metrics/linjian/lib';
import { PortraitSection, StatusSection, TraitSection, TherapySection, ActionSection } from './report/sections';

const fmt = (v: number | null, d = 0): string =>
  v == null || Number.isNaN(v) ? '--' : v.toFixed(d);

/** 报告编号：日期 + 姓名哈希（稳定可复现） */
function reportNo(name: string | undefined): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  let h = 0;
  const s = (name || 'anon') + ymd;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return `SY-${ymd}-${String(h).padStart(5, '0')}`;
}

export default function ResultScreen({
  metrics,
  form,
  duration,
  packet,
  musicUrl,
  musicLoading,
  onRestart,
}: {
  metrics: Metrics;
  form: PersonForm | null;
  duration: number;
  packet: ResultPacket | null;
  musicUrl?: string;
  musicLoading?: boolean;
  onRestart: () => void;
}) {
  const data = { metrics, form, duration, packet };
  const d = new Date();
  const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

  // 拉取大模型生成的报告动态内容（ability/qa/moodBars/buffers），失败静默走写死兜底
  const [insights, setInsights] = useState<ReportInsights | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/report/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ form, packet, metrics }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((res) => {
        if (!cancelled && res?.ok && res.insights) setInsights(res.insights);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // 仅在报告挂载时请求一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rp">
      {/* ── 封面 ── */}
      <header className="rp-cover">
        <div className="rp-cover-brand">
          <span className="rp-cover-logo">屿</span>
          <span className="rp-cover-name">有屿 SOULMATES</span>
        </div>
        <h1 className="rp-cover-title">
          你看得见
          <br />
          你的情绪吗？
        </h1>
        <p className="rp-cover-sub">一份属于你的情绪健康报告</p>
        <div className="rp-cover-meta">
          <span>报告编号 {reportNo(form?.name)}</span>
          <span>{dateStr}</span>
          <span>{form?.name || '访客'} 的专属报告</span>
        </div>
        <div className="rp-cover-wave" aria-hidden>
          {metrics.waveform.slice(0, 40).map((v, i) => (
            <i key={i} style={{ height: `${Math.max(8, v * 100)}%` }} />
          ))}
        </div>
      </header>

      {/* ── 章节组装 ── */}
      <PortraitSection {...data} />
      <StatusSection {...data} />
      <TraitSection {...data} />
      <TherapySection {...data} insights={insights} />
      <ActionSection {...data} insights={insights} />

      {/* ── 本期音乐 ── */}
      <section className="card">
        <h2 className="sec-title">本期疗愈音乐</h2>
        {musicLoading && <p className="music-tip">正在为你生成专属音乐…</p>}
        {musicUrl ? (
          <audio controls src={musicUrl} className="rp-audio" />
        ) : (
          !musicLoading && <p className="music-tip">音乐将稍后推送至你的报告。</p>
        )}
      </section>

      {/* ── 操作 ── */}
      <section className="card">
        <div className="btn-row">
          <button className="btn primary" onClick={onRestart}>
            重新测量
          </button>
        </div>
        <p className="disclaimer">⚠️ 结果仅供健康参考，不能替代专业医疗诊断。</p>
      </section>

      {/* ── 品牌尾页 ── */}
      <footer className="rp-foot">
        <span className="rp-foot-logo">屿</span>
        <b className="rp-foot-brand">有屿 SOULMATES</b>
        <p className="rp-foot-slogan">心有怀抱 · 千人千曲</p>
        <div className="rp-foot-links">
          <span>关于我们</span>
          <span>情绪百科</span>
          <span>联系客服</span>
        </div>
        <small>信赖度 {fmt(metrics.confidence)}% · 心搏 {metrics.beats} 次 · 时长 {duration.toFixed(0)}s</small>
      </footer>
    </div>
  );
}
