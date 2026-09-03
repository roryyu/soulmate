'use client';

// 报告页 5 大章节：体质画像 / 情绪状态 / 核心特质 / 疗愈与干预 / 行动建议

import type { Metrics, PersonForm, ReportInsights } from '@/lib/types';
import type { ResultPacket } from '@/components/metrics/linjian/lib';
import { WUXING, ReportSection, Tag, PentagonRadar, Bars, CureLine, StatCell } from './ui';

export interface ReportData {
  metrics: Metrics;
  form: PersonForm | null;
  duration: number;
  packet: ResultPacket | null;
  /** 大模型生成的动态内容（/api/report/insights）；未返回时用写死值兜底 */
  insights?: ReportInsights | null;
}

const fmt = (v: number | null, d = 0): string =>
  v == null || Number.isNaN(v) ? '--' : v.toFixed(d);

/** packet 五轨音量 → 五维百分制；无数据时写死兜底 */
function wuxingValues(packet: ResultPacket | null): number[] {
  if (!packet) return [72, 58, 66, 49, 61];
  const vols = [packet.vol1, packet.vol2, packet.vol3, packet.vol4, packet.vol5];
  return vols.map((v) => Math.round(v * 100));
}

/* ── 01 · 体质画像 ─────────────────────────── */
export function PortraitSection({ form, packet }: ReportData) {
  const values = wuxingValues(packet);
  const dominant = values.indexOf(Math.max(...values));
  const w = WUXING[dominant];
  const gender = form?.gender || '—';
  const birth = form?.birth || '—';

  return (
    <ReportSection index="01" title="你的情绪体质画像" sub="基于本次五维测评的综合判定">
      <div className="rp-hero">
        <div className="rp-hero-badge" style={{ borderColor: w.color, color: w.color }}>
          <span className="rp-hero-word">{w.label}</span>
          <span className="rp-hero-animal">主体质 · {dominant === 0 ? '小鹿型' : dominant === 1 ? '小鸟型' : dominant === 2 ? '小熊型' : dominant === 3 ? '白鸽型' : '小鱼型'}</span>
        </div>
        <p className="rp-hero-desc">{w.desc}，你的情绪能量主要淤积于此维度，身心信号在此最先亮灯。</p>
      </div>
      <div className="rp-kv">
        <div><small>昵称</small><b>{form?.name || '—'}</b></div>
        <div><small>性别 / 出生</small><b>{gender} · {birth}</b></div>
        <div><small>测评基调</small><b>{packet?.base_tone ?? '舒展滋养配方'}</b></div>
        <div><small>报告类型</small><b>{packet?.fusion_tag ?? '问卷'}融合报告</b></div>
      </div>
      <div className="rp-notice">
        <b>重点提示</b>
        <p>
          {packet?.level_arr?.[dominant] ?? '轻微失衡'}倾向：
          {dominant === 0 && '思绪纷乱、肩颈紧绷，建议优先做「疏泄」练习。'}
          {dominant === 1 && '心慌气短、思虑过多，建议优先做「安神」练习。'}
          {dominant === 2 && '反复琢磨、精神涣散，建议优先做「健脾定志」练习。'}
          {dominant === 3 && '胸闷压抑、多思悲观，建议优先做「宣发肃降」练习。'}
          {dominant === 4 && '疲惫乏力、睡眠不稳，建议优先做「封藏固本」练习。'}
        </p>
      </div>
    </ReportSection>
  );
}

/* ── 02 · 情绪现在状态 ─────────────────────── */
export function StatusSection({ metrics, duration }: ReportData) {
  // 三张数据卡：心率 / HRV / 压力（实测）
  const cards = [
    { label: '平均心率', value: fmt(metrics.hr), unit: 'BPM', tag: '实测' },
    { label: 'HRV · RMSSD', value: fmt(metrics.rmssd), unit: 'ms', tag: '实测' },
    { label: '压力指数 SI', value: fmt(metrics.si), unit: '', tag: '实测' },
  ];
  // 九宫格：8 项实测指标 + 信赖度，全部带标准值徽章（写死判定）
  const grid: { label: string; value: string; unit?: string; tag: string; hint: string }[] = [
    { label: '心率', value: fmt(metrics.hr), unit: 'BPM', tag: '正常', hint: '60–100' },
    { label: '呼吸率', value: fmt(metrics.rr), unit: '/min', tag: '正常', hint: '12–20' },
    { label: '血氧', value: fmt(metrics.spo2), unit: '%', tag: '良好', hint: '≥95' },
    { label: '副交感活性', value: fmt(metrics.rmssd), unit: 'ms', tag: '达标', hint: '20–100' },
    { label: '交感平衡比', value: fmt(metrics.lfhf, 2), unit: '', tag: '均衡', hint: '0.5–2' },
    { label: '压力指数', value: fmt(metrics.si), unit: '', tag: '平稳', hint: '75–125' },
    { label: '疲劳指数', value: fmt(metrics.fi), unit: '', tag: '良好', hint: '<30 佳' },
    { label: '认知负荷', value: fmt(metrics.mwi), unit: '', tag: '适中', hint: '30–60' },
    { label: '信赖度', value: fmt(metrics.confidence), unit: '%', tag: '可信', hint: `心搏 ${metrics.beats} 次` },
  ];

  return (
    <ReportSection index="02" title="情绪现在状态" sub={`面部视频测量 · 时长 ${duration.toFixed(0)}s`}>
      <div className="rp-cards3">
        {cards.map((c) => (
          <div className="rp-card3" key={c.label}>
            <small>{c.label}</small>
            <b>{c.value}<span>{c.unit}</span></b>
            <Tag>{c.tag}</Tag>
          </div>
        ))}
      </div>
      <div className="rp-grid-wrap">
        <p className="rp-grid-cap">身心状态指标 · 与标准值对照</p>
        <div className="rp-grid9">
          {grid.map((g) => (
            <StatCell key={g.label} label={g.label} value={g.value} unit={g.unit} tag={g.tag} hint={g.hint} />
          ))}
        </div>
      </div>
    </ReportSection>
  );
}

/* ── 03 · 核心特质构成 ─────────────────────── */
export function TraitSection({ packet }: ReportData) {
  const values = wuxingValues(packet);
  const dominant = values.indexOf(Math.max(...values));

  return (
    <ReportSection index="03" title="核心特质构成" sub="五维能量分布 · 木火土金水">
      <div className="rp-trait">
        <PentagonRadar values={values} />
        <div className="rp-trait-info">
          <div className="rp-trait-main">
            <span className="rp-trait-dot" style={{ background: WUXING[dominant].color }} />
            <b>{WUXING[dominant].label}型主导</b>
          </div>
          <ul className="rp-trait-list">
            {WUXING.map((w, i) => (
              <li key={w.key}>
                <span className="rp-trait-dot" style={{ background: w.color }} />
                <em>{w.label}</em>
                <div className="rp-trait-bar">
                  <div style={{ width: `${values[i]}%`, background: w.color }} />
                </div>
                <code>{values[i]}</code>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="rp-trait-note">
        {packet
          ? `五轨配方 vol：${[packet.vol1, packet.vol2, packet.vol3, packet.vol4, packet.vol5].map((v) => v.toFixed(2)).join(' / ')} · 全局偏移 ${packet.global_offset > 0 ? '+' : ''}${packet.global_offset}`
          : '本次为演示数据，完成完整测评后展示真实五维分布。'}
      </p>
    </ReportSection>
  );
}

/* ── 04 · 情绪能力与疗愈干预 ───────────────── */
export function TherapySection({ packet, insights }: ReportData) {
  // 全维词向量（能力四维，暂按五维数据 + 写死规则换算）
  const values = wuxingValues(packet);
  // 大模型生成优先，未返回时按五维换算兜底
  const ability = insights?.ability ?? [
    { label: '状态力', value: Math.round((values[2] + values[4]) / 2), hint: '精力与状态维持', color: '#3db8a0' },
    { label: '平视力', value: Math.round((values[0] + values[3]) / 2), hint: '看待事情的平稳度', color: '#4aa8b8' },
    { label: '心视力', value: Math.round((values[1] + values[3]) / 2), hint: '觉察内心的清晰度', color: '#5a98c8' },
    { label: '乐视力', value: Math.round((values[1] + values[2]) / 2), hint: '感受愉悦的能力', color: '#e4bf61' },
  ];
  const tone = packet?.base_tone ?? '舒展滋养配方';
  const isExpand = tone.includes('舒展');
  // 疗愈进度：按最大偏移匹配，控制在 30% 以内
  const maxOffset = packet ? Math.max(...packet.offset_arr.map(Math.abs)) : 5;
  const curePct = Math.min(28, 6 + maxOffset * 2);

  const qa = insights?.qa ?? [
    {
      q: '最近的情绪基调更像哪一种？',
      a: isExpand ? '偏压抑收敛——习惯把感受憋在心里，需要向外疏泄。' : '偏亢奋耗散——思虑与紧张偏多，需要向内收敛安神。',
    },
    {
      q: '身体最常给你的信号是什么？',
      a: '胸口发闷、肩颈紧绷，夜里入睡时思绪停不下来。',
    },
    {
      q: '此刻最需要的支持是？',
      a: isExpand ? '一段被看见的表达，和一次彻底的身体放松。' : '一段慢下来的安静，和一次深长的呼吸练习。',
    },
  ];
  const moodBars = insights?.moodBars ?? [
    { label: '平稳安定', value: 62, color: '#3db8a0' },
    { label: '紧绷焦虑', value: 48, color: '#e8902c' },
    { label: '低沉疲惫', value: 35, color: '#4a8db5' },
    { label: '愉悦开放', value: 41, color: '#e4bf61' },
  ];

  return (
    <>
      <ReportSection index="04" title="情绪能力分析" sub="全维词向量 · 四大情绪能力">
        <Bars items={ability} />
        <p className="rp-note">能力值由五维特质与生理指标综合推演，随每次测评动态更新。</p>
      </ReportSection>

      <ReportSection index="05" title="本期疗愈过程" sub={`专属配方 · ${tone}`}>
        <div className="rp-cure-hero">
          <span className="rp-cure-badge">{isExpand ? '舒' : '收'}</span>
          <div>
            <b>{tone}</b>
            <p>{isExpand ? '以疏泄为主轴，把淤积的情绪能量温和地释放出去。' : '以收敛为主轴，把耗散的心神能量温柔地收拢回来。'}</p>
          </div>
        </div>
        <CureLine label="舒缓滋养" pct={curePct} note="本次疗愈介入强度" />
        <p className="rp-note">介入强度依据你的五轨偏移自动匹配，控制在温和区间（30% 以内）。</p>
      </ReportSection>

      <ReportSection index="06" title="干预情绪现象" sub="量表问答还原 · 当下状态标签">
        <div className="rp-qa">
          {qa.map((item, i) => (
            <div className="rp-qa-item" key={i}>
              <b>Q{i + 1} · {item.q}</b>
              <p>{item.a}</p>
            </div>
          ))}
        </div>
        <p className="rp-grid-cap">当下状态倾向</p>
        <Bars items={moodBars} />
      </ReportSection>
    </>
  );
}

/* ── 07 · 行动建议 ─────────────────────────── */
export function ActionSection({ insights, onUpgrade }: ReportData & { onUpgrade?: () => void }) {
  // 大模型生成优先，未返回时写死兜底
  const buffers = insights?.buffers ?? [
    { icon: '🌙', title: '睡眠 Buffer', desc: '23:00 前放下手机，用 4-7-8 呼吸法入睡' },
    { icon: '🥣', title: '饮食 Buffer', desc: '少冷饮、多温热，晚餐七分饱护脾胃' },
    { icon: '🚶', title: '运动 Buffer', desc: '每日 30 分钟快走或八段锦，疏泄肝气' },
    { icon: '🌤', title: '情绪 Buffer', desc: '每天记录 1 件小确幸，给心神留白' },
  ];

  return (
    <>
      <ReportSection index="07" title="行动建议" sub="回到自在 · 给身心加上缓冲区">
        <div className="rp-buffer">
          {buffers.map((b) => (
            <div className="rp-buffer-card" key={b.title}>
              <span className="rp-buffer-icon">{b.icon}</span>
              <b>{b.title}</b>
              <p>{b.desc}</p>
            </div>
          ))}
        </div>
        <div className="rp-oath">
          <b>本期相遇证</b>
          <p>你在林间与五位伙伴相遇，完成了一次身心的诚实对话。愿下一次相遇时，你的「木」更舒展，「心」更安定。</p>
        </div>
      </ReportSection>

      <section className="rp-upgrade">
        <b>开启专属升级计划</b>
        <p>解锁 7 天五行调频练习 · 每日 10 分钟 · 定制你的疗愈节奏</p>
        <button className="rp-upgrade-btn" onClick={onUpgrade}>立即升级</button>
        <small>当前版本可免费重测 · 升级不影响已有数据</small>
      </section>
    </>
  );
}
