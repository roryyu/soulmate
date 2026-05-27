import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** 系统配置键（与 SystemSetting.key 一致，后续新增项在此扩展） */
export const SYSTEM_SETTING_KEYS = {
  /** 新注册用户赠送的积分数 */
  NEW_USER_GIFT_CREDITS: 'NEW_USER_GIFT_CREDITS',
  /** 文献综述生成：聚焦主题 RAG 检索合并后参与拼 prompt 的片段条数（每文档检索上限与此相同） */
  LITERATURE_REVIEW_RAG_TOP_K: 'LITERATURE_REVIEW_RAG_TOP_K',
} as const;

/** 数据库无记录时的默认赠送积分（有记录且为 0 则不再用此默认值） */
export const DEFAULT_NEW_USER_GIFT_CREDITS = 100;

export const MAX_NEW_USER_GIFT_CREDITS = 1_000_000;

/** 文献综述 RAG：无配置或非法时的默认条数 */
export const DEFAULT_LITERATURE_REVIEW_RAG_TOP_K = 30;

export const MIN_LITERATURE_REVIEW_RAG_TOP_K = 1;

/** 上限避免单次 prompt 过大、耗时过长 */
export const MAX_LITERATURE_REVIEW_RAG_TOP_K = 200;

/** 从库中读取新用户赠送积分；无记录或非法值则返回默认值 */
export async function getNewUserGiftCredits(): Promise<number> {
  const row = await prisma.systemSetting.findUnique({
    where: { key: SYSTEM_SETTING_KEYS.NEW_USER_GIFT_CREDITS },
  });
  if (row?.value == null || row.value === '') return DEFAULT_NEW_USER_GIFT_CREDITS;
  const n = parseInt(row.value, 10);
  if (Number.isNaN(n) || n < 0) return DEFAULT_NEW_USER_GIFT_CREDITS;
  return Math.min(n, MAX_NEW_USER_GIFT_CREDITS);
}

/**
 * 生成 prisma.user.create 中与积分相关的嵌套写入；
 * 赠送为 0 时不创建钱包与流水（与「无赠送」语义一致，首次充值时再 upsert）
 */
export function buildNewUserCreditNestedCreate(
  giftCredits: number
): Pick<Prisma.UserCreateInput, 'credit' | 'creditTransactions'> {
  const gift = Math.min(Math.max(0, Math.floor(giftCredits)), MAX_NEW_USER_GIFT_CREDITS);
  if (gift <= 0) return {};
  const description = `新用户注册赠送 ${gift} 积分`;
  return {
    credit: { create: { balance: gift } },
    creditTransactions: {
      create: {
        amount: gift,
        type: 'ADMIN_ADJUST',
        description,
        balanceAfter: gift,
      },
    },
  };
}

/** 管理员更新：新用户赠送积分（0 表示不赠送；写入 SystemSetting） */
export async function setNewUserGiftCredits(value: number): Promise<number> {
  const gift = Math.min(Math.max(0, Math.floor(value)), MAX_NEW_USER_GIFT_CREDITS);
  await prisma.systemSetting.upsert({
    where: { key: SYSTEM_SETTING_KEYS.NEW_USER_GIFT_CREDITS },
    create: {
      key: SYSTEM_SETTING_KEYS.NEW_USER_GIFT_CREDITS,
      value: String(gift),
    },
    update: { value: String(gift) },
  });
  return gift;
}

/** 读取文献综述 RAG 最终采用的片段条数；无记录或非法值则返回默认值 */
export async function getLiteratureReviewRagTopK(): Promise<number> {
  const row = await prisma.systemSetting.findUnique({
    where: { key: SYSTEM_SETTING_KEYS.LITERATURE_REVIEW_RAG_TOP_K },
  });
  if (row?.value == null || row.value === '') return DEFAULT_LITERATURE_REVIEW_RAG_TOP_K;
  const n = parseInt(row.value, 10);
  if (Number.isNaN(n) || n < MIN_LITERATURE_REVIEW_RAG_TOP_K) {
    return DEFAULT_LITERATURE_REVIEW_RAG_TOP_K;
  }
  return Math.min(n, MAX_LITERATURE_REVIEW_RAG_TOP_K);
}

/** 管理员更新：文献综述 RAG top-K */
export async function setLiteratureReviewRagTopK(value: number): Promise<number> {
  const k = Math.min(
    Math.max(MIN_LITERATURE_REVIEW_RAG_TOP_K, Math.floor(value)),
    MAX_LITERATURE_REVIEW_RAG_TOP_K
  );
  await prisma.systemSetting.upsert({
    where: { key: SYSTEM_SETTING_KEYS.LITERATURE_REVIEW_RAG_TOP_K },
    create: {
      key: SYSTEM_SETTING_KEYS.LITERATURE_REVIEW_RAG_TOP_K,
      value: String(k),
    },
    update: { value: String(k) },
  });
  return k;
}
