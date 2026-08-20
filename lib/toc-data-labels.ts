/**
 * TocData 标签功能：AI 标签生成、标签归一化、标签同步
 */
import type { Label } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { chatWithLogging, AI_MODEL } from '@/lib/ai';
import { LABEL_PROMPTS } from '@/lib/prompts';

/** 单个标签最大长度 */
const MAX_LABEL_LENGTH = 20;

/**
 * 归一化标签列表：去除空白、过滤空值、去重（忽略大小写）、限制单个标签长度
 */
export function normalizeLabels(labels: unknown): string[] {
  if (!Array.isArray(labels)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of labels) {
    const name = String(item ?? '').trim().slice(0, MAX_LABEL_LENGTH);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

/**
 * 从大模型返回文本中解析标签数组
 * 兼容：标准 JSON、带 ```json 代码块包裹、纯文本逗号分隔等容错场景
 */
function parseLabelsFromAIResponse(content: string): string[] {
  // 去除 markdown 代码块包裹
  const cleaned = content.replace(/```(?:json)?/gi, '').trim();

  // 尝试直接解析 JSON
  const tryParse = (text: string): string[] | null => {
    try {
      const parsed = JSON.parse(text);
      if (parsed && Array.isArray(parsed.labels)) {
        return normalizeLabels(parsed.labels);
      }
      if (Array.isArray(parsed)) {
        return normalizeLabels(parsed);
      }
    } catch {
      // 继续其他解析方式
    }
    return null;
  };

  const direct = tryParse(cleaned);
  if (direct && direct.length > 0) return direct;

  // 提取文本中的 JSON 对象/数组片段再解析
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/) || cleaned.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    const extracted = tryParse(jsonMatch[0]);
    if (extracted && extracted.length > 0) return extracted;
  }

  // 兜底：按逗号/顿号/换行切分
  return normalizeLabels(cleaned.split(/[,，、\n]/));
}

/**
 * 根据文件名调用大模型生成标签
 * 失败时返回空数组，不阻断上传主流程
 */
export async function generateLabelsFromFileName(
  fileName: string,
  userId?: string | null,
  userName?: string | null
): Promise<string[]> {
  try {
    const completion = await chatWithLogging(
      {
        model: AI_MODEL,
        messages: [
          { role: 'system', content: LABEL_PROMPTS.SYSTEM },
          { role: 'user', content: LABEL_PROMPTS.USER(fileName) },
        ],
        response_format: { type: 'json_object' },
      },
      { module: '文件标签生成', userId, userName, metadata: { fileName } }
    );

    const content = completion.choices[0]?.message?.content || '';
    return parseLabelsFromAIResponse(content);
  } catch (error) {
    console.error('AI 生成标签失败:', error);
    return [];
  }
}

/**
 * 同步某个 TocData 的标签：以传入的标签名列表为最终状态（新增缺失标签、移除不在列表中的关联）
 * 返回同步后的标签列表 [{ id, name }]
 */
export async function syncTocDataLabels(
  tocDataId: string,
  labelNames: string[]
): Promise<Array<{ id: string; name: string }>> {
  const normalized = normalizeLabels(labelNames);

  const labels = await prisma.$transaction(async (tx) => {
    // 逐个 upsert 标签：已存在则复用，不存在则创建（避免并发下唯一约束冲突）
    const all: Label[] = [];
    for (const name of normalized) {
      all.push(
        await tx.label.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      );
    }

    // 全量替换该文件的标签关联
    await tx.tocDataLabel.deleteMany({ where: { tocDataId } });
    if (all.length > 0) {
      await tx.tocDataLabel.createMany({
        data: all.map((label) => ({ tocDataId, labelId: label.id })),
      });
    }

    return all;
  });

  // 按传入顺序返回
  const order = new Map(normalized.map((name, index) => [name, index]));
  return labels
    .sort((a, b) => (order.get(a.name) ?? 0) - (order.get(b.name) ?? 0))
    .map((l) => ({ id: l.id, name: l.name }));
}
