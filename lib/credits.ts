import { prisma } from '@/lib/prisma';

// 支持的 AI 操作类型常量
export const AI_OPERATION_TYPES = {
  IDEATION: 'IDEATION',       // 选题生成
  SEARCH: 'SEARCH',           // 检索式生成
  ANALYZE: 'ANALYZE',         // 文献分析
  CHAT: 'CHAT',               // 文档问答
  WRITING: 'WRITING',         // 研究写作
  POLISHING: 'POLISHING',     // 论文润色
  OUTLINE: 'OUTLINE',         // 综述大纲
  OCR_UPLOAD: 'OCR_UPLOAD',   // 文献上传 PDF OCR（按页数分档计费）
} as const;

export type AIOperationType = (typeof AI_OPERATION_TYPES)[keyof typeof AI_OPERATION_TYPES];

export interface CheckCreditsResult {
  allowed: boolean;
  reason?: string;
  /** 若为 true 表示本次消耗由会员权益覆盖，积分未扣减 */
  isMemberFree?: boolean;
  /** 消耗后的积分余额（非会员时有值） */
  balanceAfter?: number;
}

/** 当前用户是否在会员有效期内（可复用） */
async function userHasActiveMembership(userId: string): Promise<boolean> {
  const now = new Date();
  const activeMembership = await prisma.userMembership.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      endAt: { gt: now },
    },
  });
  return Boolean(activeMembership);
}

/**
 * 原子扣减积分并写流水（非会员路径；调用方需已确认应扣费）
 */
async function deductUserCredits(
  userId: string,
  cost: number,
  operationType: string,
  description: string
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const credit = await tx.userCredit.findUnique({
      where: { userId },
    });

    const currentBalance = credit?.balance ?? 0;

    if (currentBalance < cost) {
      throw new InsufficientCreditsError(currentBalance, cost);
    }

    const newBalance = currentBalance - cost;

    await tx.userCredit.upsert({
      where: { userId },
      update: { balance: newBalance },
      create: { userId, balance: 0 },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        amount: -cost,
        type: 'CONSUME',
        description,
        operationType,
        balanceAfter: newBalance,
      },
    });

    return newBalance;
  });
}

/**
 * PDF OCR 上传：每满 100 页为一档，不足 100 页按一档；每档消耗 = 后台配置的 creditCost（默认 10）
 */
export function computeOcrUploadCreditCost(pageCount: number, creditsPerHundredPages: number): number {
  const pages = Math.max(1, pageCount);
  const blocks = Math.ceil(pages / 100);
  return blocks * Math.max(0, creditsPerHundredPages);
}

/**
 * 文献上传走火山 OCR 时的积分校验（仅 PDF；Word 不调用）
 * 规则：会员免费；配置关闭或单价≤0 则免费；否则按页数分档扣费。
 */
export async function checkOcrUploadCredits(
  userId: string,
  pageCount: number
): Promise<CheckCreditsResult> {
  if (await userHasActiveMembership(userId)) {
    return { allowed: true, isMemberFree: true };
  }

  const operationType = AI_OPERATION_TYPES.OCR_UPLOAD;
  const opConfig = await prisma.aIOperationConfig.findUnique({
    where: { operationType },
  });

  if (!opConfig || !opConfig.isActive) {
    return { allowed: true, isMemberFree: false };
  }

  const cost = computeOcrUploadCreditCost(pageCount, opConfig.creditCost);
  if (cost <= 0) {
    return { allowed: true, isMemberFree: false };
  }

  const pages = Math.max(1, pageCount);
  const blocks = Math.ceil(pages / 100);
  const description = `上传文献 PDF OCR（${pages} 页，${blocks} 档×${opConfig.creditCost} 积分）共 ${cost} 积分`;

  try {
    const newBalance = await deductUserCredits(userId, cost, operationType, description);
    return { allowed: true, isMemberFree: false, balanceAfter: newBalance };
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return {
        allowed: false,
        reason: `积分不足，本次 PDF OCR 需要 ${err.required} 积分，当前余额 ${err.current} 积分`,
      };
    }
    throw err;
  }
}

/**
 * 统一积分/会员鉴权入口。
 * 执行顺序：
 *   1. 检查用户是否有有效会员 → 是则免费放行
 *   2. 查询该操作的积分消耗配置（isActive=false 时默认免费）
 *   3. 原子事务扣减积分，余额不足返回拒绝
 */
export async function checkCreditsAndConsume(
  userId: string,
  operationType: AIOperationType
): Promise<CheckCreditsResult> {
  // 中文注释：OCR 按页分档计费，禁止误用为「单次固定消耗」
  if (operationType === AI_OPERATION_TYPES.OCR_UPLOAD) {
    throw new Error('OCR_UPLOAD 请使用 checkOcrUploadCredits(userId, pageCount)');
  }

  if (await userHasActiveMembership(userId)) {
    return { allowed: true, isMemberFree: true };
  }

  const opConfig = await prisma.aIOperationConfig.findUnique({
    where: { operationType },
  });

  if (!opConfig || !opConfig.isActive) {
    return { allowed: true, isMemberFree: false };
  }

  const cost = opConfig.creditCost;

  if (cost <= 0) {
    return { allowed: true, isMemberFree: false };
  }

  try {
    const description = `使用 ${operationType} 功能消耗 ${cost} 积分`;
    const newBalance = await deductUserCredits(userId, cost, operationType, description);
    return { allowed: true, isMemberFree: false, balanceAfter: newBalance };
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return {
        allowed: false,
        reason: `积分不足，本次操作需要 ${err.required} 积分，当前余额 ${err.current} 积分`,
      };
    }
    throw err;
  }
}

/** 自定义错误：积分不足 */
class InsufficientCreditsError extends Error {
  constructor(
    public readonly current: number,
    public readonly required: number
  ) {
    super(`积分不足：需要 ${required}，当前 ${current}`);
    this.name = 'InsufficientCreditsError';
  }
}

/**
 * 查询用户积分余额（不存在则返回 0）
 */
export async function getUserCreditBalance(userId: string): Promise<number> {
  const credit = await prisma.userCredit.findUnique({ where: { userId } });
  return credit?.balance ?? 0;
}

/**
 * 管理员手动调整用户积分
 */
export async function adminAdjustCredits(
  userId: string,
  amount: number,
  description: string
): Promise<{ newBalance: number }> {
  const result = await prisma.$transaction(async (tx) => {
    const credit = await tx.userCredit.findUnique({ where: { userId } });
    const currentBalance = credit?.balance ?? 0;
    const newBalance = Math.max(0, currentBalance + amount);

    await tx.userCredit.upsert({
      where: { userId },
      update: { balance: newBalance },
      create: { userId, balance: newBalance },
    });

    await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        type: 'ADMIN_ADJUST',
        description,
        balanceAfter: newBalance,
      },
    });

    return newBalance;
  });

  return { newBalance: result };
}
