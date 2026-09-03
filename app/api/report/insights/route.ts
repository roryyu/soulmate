// 报告洞察接口：输入 form/packet/metrics → 大模型生成报告四组动态内容
// ability（情绪能力）/ qa（干预问答）/ moodBars（状态倾向）/ buffers（行动建议）
// 生成失败或字段非法时，逐类别回退到与前端一致的默认内容。

import { NextResponse } from 'next/server';
import type { Metrics, PersonForm, ReportInsights } from '@/lib/types';
import type { ResultPacket } from '@/components/metrics/linjian/lib';
import { chatWithLogging, getDefaultModel } from '@/lib/ai';

/** 情绪能力四维：标签与配色固定，LLM 只生成 value 与 hint */
const ABILITY_DEFS = [
  { label: '状态力', color: '#3db8a0', hint: '精力与状态维持' },
  { label: '平视力', color: '#4aa8b8', hint: '看待事情的平稳度' },
  { label: '心视力', color: '#5a98c8', hint: '觉察内心的清晰度' },
  { label: '乐视力', color: '#e4bf61', hint: '感受愉悦的能力' },
];

/** 状态倾向条配色（按序号取用） */
const MOOD_COLORS = ['#3db8a0', '#e8902c', '#4a8db5', '#e4bf61'];

/** 与前端写死值一致的兜底内容 */
const DEFAULT_INSIGHTS: ReportInsights = {
  ability: ABILITY_DEFS.map((d) => ({ ...d, value: 60 })),
  qa: [
    { q: '最近的情绪基调更像哪一种？', a: '思绪与身体信号偏紧，需要一段温和的疏泄。' },
    { q: '身体最常给你的信号是什么？', a: '胸口发闷、肩颈紧绷，夜里入睡时思绪停不下来。' },
    { q: '此刻最需要的支持是？', a: '一段被看见的表达，和一次彻底的身体放松。' },
  ],
  moodBars: [
    { label: '平稳安定', value: 55, color: MOOD_COLORS[0] },
    { label: '紧绷焦虑', value: 45, color: MOOD_COLORS[1] },
    { label: '低沉疲惫', value: 40, color: MOOD_COLORS[2] },
    { label: '愉悦开放', value: 45, color: MOOD_COLORS[3] },
  ],
  buffers: [
    { icon: '🌙', title: '睡眠 Buffer', desc: '23:00 前放下手机，用 4-7-8 呼吸法入睡' },
    { icon: '🥣', title: '饮食 Buffer', desc: '少冷饮、多温热，晚餐七分饱护脾胃' },
    { icon: '🚶', title: '运动 Buffer', desc: '每日 30 分钟快走或八段锦，疏泄肝气' },
    { icon: '🌤', title: '情绪 Buffer', desc: '每天记录 1 件小确幸，给心神留白' },
  ],
};

const clamp100 = (v: unknown, fb: number): number => {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fb;
  return Math.round(Math.min(100, Math.max(0, n)));
};
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** 逐类别归一化，非法时回退默认 */
function normalize(raw: unknown): ReportInsights {
  const out: ReportInsights = {
    ability: [...DEFAULT_INSIGHTS.ability],
    qa: [...DEFAULT_INSIGHTS.qa],
    moodBars: [...DEFAULT_INSIGHTS.moodBars],
    buffers: [...DEFAULT_INSIGHTS.buffers],
  };
  if (!raw || typeof raw !== 'object') return out;
  const obj = raw as Record<string, unknown>;

  if (Array.isArray(obj.ability)) {
    const items = obj.ability as Record<string, unknown>[];
    out.ability = ABILITY_DEFS.map((def) => {
      const hit = items.find((it) => it && str(it.label) === def.label);
      return {
        label: def.label,
        color: def.color,
        hint: str(hit?.hint) || def.hint,
        value: clamp100(hit?.value, 60),
      };
    });
  }

  if (Array.isArray(obj.qa)) {
    const qa = (obj.qa as Record<string, unknown>[])
      .map((it) => ({ q: str(it?.q), a: str(it?.a) }))
      .filter((it) => it.q && it.a)
      .slice(0, 3);
    if (qa.length >= 1) out.qa = qa;
  }

  if (Array.isArray(obj.moodBars)) {
    const bars = (obj.moodBars as Record<string, unknown>[])
      .map((it, i) => ({
        label: str(it?.label),
        value: clamp100(it?.value, 50),
        color: MOOD_COLORS[i % MOOD_COLORS.length],
      }))
      .filter((it) => it.label)
      .slice(0, 4);
    if (bars.length >= 2) out.moodBars = bars;
  }

  if (Array.isArray(obj.buffers)) {
    const bufs = (obj.buffers as Record<string, unknown>[])
      .map((it) => ({
        icon: str(it?.icon) || '🌿',
        title: str(it?.title),
        desc: str(it?.desc),
      }))
      .filter((it) => it.title && it.desc)
      .slice(0, 4);
    if (bufs.length >= 2) out.buffers = bufs;
  }

  return out;
}

const SYSTEM_PROMPT = `你是有屿 SOULMATES 情绪健康报告的撰写助手，依据用户的测评数据生成个性化的报告内容。

要求：
1. 只输出一个 JSON 对象，结构严格如下（不要输出任何其他文字或代码块标记）：
{"ability":[{"label":"状态力","value":72,"hint":"一句话解释该维度现状"}],"qa":[{"q":"问题","a":"回答"}],"moodBars":[{"label":"状态词","value":63}],"buffers":[{"icon":"🌙","title":"睡眠 Buffer","desc":"一条具体可执行的建议"}]}
2. ability 固定为四项，label 必须依次是：状态力、平视力、心视力、乐视力；value 为 0-100 整数，结合数据给出有区分度的分数；hint 用一句话（15 字内）描述该能力的现状。
3. qa 三项：从用户视角出发的问答，还原"当下的状态与需求"，回答温暖、具体、口语化，每条 40 字以内。
4. moodBars 四项：描述当下状态倾向（如 平稳安定/紧绷焦虑/低沉疲惫/愉悦开放），label 可依据数据微调措辞，value 为 0-100 强度整数，四项总和大约在 150-250 之间。
5. buffers 四项：icon 用单个 emoji，title 格式为「XX Buffer」（睡眠/饮食/运动/情绪等维度），desc 为一条具体、可执行的生活建议，25 字以内，贴合用户的五行体质与数据特征。
6. 语气温暖、第二人称、不评判；避免任何医疗诊断或用药建议；全部使用简体中文。`;

export async function POST(req: Request) {
  let body: { form?: PersonForm; packet?: ResultPacket | null; metrics?: Metrics } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const { form, packet, metrics } = body;

  if (!metrics || typeof metrics !== 'object') {
    return NextResponse.json({ ok: false, error: '缺少 metrics 数据' }, { status: 400 });
  }

  // 组装用户数据（waveform 数组过大，不进入提示词）
  const userData = {
    用户信息: form
      ? {
          昵称: form.name || '访客',
          性别: form.gender || '未填写',
          出生: form.birth || '未填写',
          身高cm: form.height || '未填写',
          体重kg: form.weight || '未填写',
          补充说明: form.note || '无',
        }
      : '访客（未填写表单）',
    生理指标: metrics && {
      心率BPM: metrics.hr,
      呼吸率: metrics.rr,
      血氧: metrics.spo2,
      HRV_RMSSD_ms: metrics.rmssd,
      交感平衡比LFHF: metrics.lfhf,
      压力指数SI: metrics.si,
      疲劳指数: metrics.fi,
      认知负荷: metrics.mwi,
      运动伪影: metrics.motion,
      信赖度: metrics.confidence,
      心搏数: metrics.beats,
    },
    量表五轨: packet
      ? {
          基调: packet.base_tone,
          融合标签: packet.fusion_tag,
          五轨音量: [packet.vol1, packet.vol2, packet.vol3, packet.vol4, packet.vol5],
          五轨偏移: packet.offset_arr,
          失衡等级: packet.level_arr,
          五行T分: packet.t_score,
          是否平衡: packet.is_balance,
          是否冲突: packet.has_conflict,
        }
      : '无量表数据',
  };

  try {
    const completion = await chatWithLogging(
      {
        model: getDefaultModel(),
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `请依据以下测评数据生成报告内容：\n${JSON.stringify(userData, null, 2)}`,
          },
        ],
        temperature: 0.8,
        max_tokens: 1600,
        response_format: { type: 'json_object' },
      },
      { module: '测评报告洞察' }
    );

    const content = completion.choices[0]?.message?.content || '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({ ok: false, error: '模型输出解析失败' });
    }
    return NextResponse.json({ ok: true, insights: normalize(parsed) });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[report/insights] 生成失败:', msg);
    return NextResponse.json({ ok: false, error: msg });
  }
}
