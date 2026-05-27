import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 中文注释：前台只读接口，用于展示「各操作消耗的积分」；不涉及敏感信息，可公开访问
const OPERATION_DEFAULTS: Record<string, { description: string; creditCost: number }> = {
  IDEATION: { description: '选题灵感生成', creditCost: 10 },
  SEARCH: { description: 'CNKI 检索式生成', creditCost: 10 },
  ANALYZE: { description: '文献智能分析', creditCost: 10 },
  CHAT: { description: '文献问答对话', creditCost: 10 },
  WRITING: { description: '研究写作生成', creditCost: 10 },
  POLISHING: { description: '论文润色操作', creditCost: 10 },
  OUTLINE: { description: '综述大纲生成', creditCost: 10 },
  // 中文注释：OCR_UPLOAD 的 creditCost 表示「每 100 页一档」的单价
  OCR_UPLOAD: { description: '文献上传 PDF OCR（按页数分档）', creditCost: 10 },
};

export async function GET() {
  const configs = await prisma.aIOperationConfig.findMany({
    orderBy: { operationType: 'asc' },
  });

  // 中文注释：补齐 DB 尚未创建的预设操作项，保证前端展示稳定
  const configMap = Object.fromEntries(configs.map((c) => [c.operationType, c]));
  const allConfigs = Object.keys(OPERATION_DEFAULTS).map((opType) => {
    const fromDb = configMap[opType];
    return {
      operationType: opType,
      creditCost: fromDb?.creditCost ?? OPERATION_DEFAULTS[opType].creditCost,
      description: fromDb?.description ?? OPERATION_DEFAULTS[opType].description,
      isActive: fromDb?.isActive ?? true,
      updatedAt: fromDb?.updatedAt ?? null,
    };
  });

  return NextResponse.json({ success: true, configs: allConfigs });
}

