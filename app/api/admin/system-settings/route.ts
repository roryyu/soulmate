import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import {
  getNewUserGiftCredits,
  setNewUserGiftCredits,
  MAX_NEW_USER_GIFT_CREDITS,
  getLiteratureReviewRagTopK,
  setLiteratureReviewRagTopK,
  MIN_LITERATURE_REVIEW_RAG_TOP_K,
  MAX_LITERATURE_REVIEW_RAG_TOP_K,
} from '@/lib/system-settings';

export const dynamic = 'force-dynamic';

// 管理端：读取系统配置（可扩展为多字段）
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const newUserGiftCredits = await getNewUserGiftCredits();
  const literatureReviewRagTopK = await getLiteratureReviewRagTopK();

  return NextResponse.json({
    success: true,
    settings: {
      newUserGiftCredits,
      literatureReviewRagTopK,
    },
  });
}

// 管理端：更新系统配置
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体不是合法 JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '请求体须为 JSON 对象' }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  let updated = false;

  if ('newUserGiftCredits' in payload) {
    const raw = payload.newUserGiftCredits;
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseInt(raw, 10) : NaN;
    // 中文注释：必须为整数且在业务允许范围内（与 lib/system-settings 上限一致）
    if (!Number.isFinite(n) || Number.isNaN(n) || !Number.isInteger(n) || n < 0 || n > MAX_NEW_USER_GIFT_CREDITS) {
      return NextResponse.json(
        { error: `newUserGiftCredits 须为 0～${MAX_NEW_USER_GIFT_CREDITS} 的整数` },
        { status: 400 }
      );
    }
    await setNewUserGiftCredits(n);
    updated = true;
  }

  if ('literatureReviewRagTopK' in payload) {
    const raw = payload.literatureReviewRagTopK;
    const k = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseInt(raw, 10) : NaN;
    // 中文注释：文献综述 RAG 条数，与生成接口 read 逻辑一致
    if (
      !Number.isFinite(k) ||
      Number.isNaN(k) ||
      !Number.isInteger(k) ||
      k < MIN_LITERATURE_REVIEW_RAG_TOP_K ||
      k > MAX_LITERATURE_REVIEW_RAG_TOP_K
    ) {
      return NextResponse.json(
        {
          error: `literatureReviewRagTopK 须为 ${MIN_LITERATURE_REVIEW_RAG_TOP_K}～${MAX_LITERATURE_REVIEW_RAG_TOP_K} 的整数`,
        },
        { status: 400 }
      );
    }
    await setLiteratureReviewRagTopK(k);
    updated = true;
  }

  if (!updated) {
    return NextResponse.json({ error: '请至少提供 newUserGiftCredits 或 literatureReviewRagTopK 之一' }, { status: 400 });
  }

  const newUserGiftCredits = await getNewUserGiftCredits();
  const literatureReviewRagTopK = await getLiteratureReviewRagTopK();

  return NextResponse.json({
    success: true,
    settings: {
      newUserGiftCredits,
      literatureReviewRagTopK,
    },
  });
}
