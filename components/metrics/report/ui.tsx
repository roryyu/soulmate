'use client';

// 报告页共享 UI 组件：章节容器 / 五行雷达图 / 横向条形图 / 进度条 / 徽章

import type { ReactNode } from 'react';

/** 五行维度定义（颜色与 linjian ANIMALS 一致） */
export const WUXING = [
  { key: 'wood', label: '木', animal: 'deer', color: '#82cdb8', desc: '疏泄 · 情绪的流动' },
  { key: 'fire', label: '火', animal: 'bird', color: '#efa777', desc: '神明 · 心神的安定' },
  { key: 'earth', label: '土', animal: 'bear', color: '#e4bf61', desc: '运化 · 思虑的承载' },
  { key: 'metal', label: '金', animal: 'dove', color: '#c9b98a', desc: '肃降 · 气机的收放' },
  { key: 'water', label: '水', animal: 'fish', color: '#77c6dc', desc: '封藏 · 精力的蓄养' },
] as const;

/** 报告章节容器 */
export function ReportSection({
  index,
  title,
  sub,
  children,
}: {
  index?: string;
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <section className="rp-sec card">
      <div className="rp-sec-head">
        <h2 className="sec-title">
          {index && <span className="rp-sec-idx">{index}</span>}
          {title}
        </h2>
        {sub && <p className="rp-sec-sub">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

/** 绿色结论徽章 */
export function Tag({ children }: { children: ReactNode }) {
  return <span className="rp-tag">{children}</span>;
}

/**
 * 五边形雷达图（SVG）
 * @param values 5 维数值 0-100，顺序与 WUXING 一致
 */
export function PentagonRadar({ values, size = 220 }: { values: number[]; size?: number }) {
  const c = size / 2;
  const r = size / 2 - 34;
  const n = 5;
  // 顶点角度：从正上方开始顺时针
  const pt = (i: number, ratio: number): [number, number] => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + Math.cos(a) * r * ratio, c + Math.sin(a) * r * ratio];
  };
  const ring = (ratio: number) =>
    Array.from({ length: n }, (_, i) => pt(i, ratio).join(',')).join(' ');
  const dataPts = values
    .slice(0, n)
    .map((v, i) => pt(i, Math.min(1, Math.max(0.05, v / 100))).join(','))
    .join(' ');

  return (
    <svg className="rp-radar" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* 背景网格 */}
      {[0.25, 0.5, 0.75, 1].map((ratio) => (
        <polygon key={ratio} points={ring(ratio)} className="rp-radar-grid" />
      ))}
      {/* 轴线 */}
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} className="rp-radar-axis" />;
      })}
      {/* 数据面 */}
      <polygon points={dataPts} className="rp-radar-data" />
      {/* 数据顶点 */}
      {values.slice(0, n).map((v, i) => {
        const [x, y] = pt(i, Math.min(1, Math.max(0.05, v / 100)));
        return <circle key={i} cx={x} cy={y} r={3.5} fill={WUXING[i].color} stroke="#fff" strokeWidth={1.5} />;
      })}
      {/* 维度标签 */}
      {WUXING.map((w, i) => {
        const [x, y] = pt(i, 1.22);
        return (
          <g key={w.key}>
            <text x={x} y={y - 2} textAnchor="middle" className="rp-radar-label">
              {w.label}
            </text>
            <text x={x} y={y + 12} textAnchor="middle" className="rp-radar-val">
              {Math.round(values[i])}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** 横向条形图（百分比） */
export function Bars({
  items,
}: {
  items: { label: string; value: number; color?: string; hint?: string }[];
}) {
  return (
    <div className="rp-bars">
      {items.map((it) => (
        <div className="rp-bar-row" key={it.label}>
          <div className="rp-bar-meta">
            <span className="rp-bar-label">{it.label}</span>
            {it.hint && <small className="rp-bar-hint">{it.hint}</small>}
            <b className="rp-bar-val">{Math.round(it.value)}%</b>
          </div>
          <div className="rp-bar-track">
            <div
              className="rp-bar-fill"
              style={{ width: `${Math.min(100, Math.max(2, it.value))}%`, background: it.color || 'var(--accent)' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 疗愈配方进度条（进度按数据匹配，控制在 30% 以内展示） */
export function CureLine({ label, pct, note }: { label: string; pct: number; note?: string }) {
  return (
    <div className="rp-cure">
      <div className="rp-bar-meta">
        <span className="rp-bar-label">{label}</span>
        {note && <small className="rp-bar-hint">{note}</small>}
        <b className="rp-bar-val">{Math.round(pct)}%</b>
      </div>
      <div className="rp-cure-track">
        <div className="rp-cure-fill" style={{ width: `${Math.min(100, Math.max(2, pct))}%` }} />
      </div>
    </div>
  );
}

/** 指标小卡（九宫格用） */
export function StatCell({
  label,
  value,
  unit,
  tag,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  tag?: string;
  hint?: string;
}) {
  return (
    <div className="rp-stat">
      <div className="rp-stat-top">
        <span className="rp-stat-label">{label}</span>
        {tag && <Tag>{tag}</Tag>}
      </div>
      <b className="rp-stat-val">
        {value}
        {unit && <small>{unit}</small>}
      </b>
      {hint && <p className="rp-stat-hint">{hint}</p>}
    </div>
  );
}
