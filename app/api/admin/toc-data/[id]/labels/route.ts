import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { syncTocDataLabels } from '@/lib/toc-data-labels';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 更新某个文件的标签（全量替换：支持新增、删除）
 * body: { labels: string[] }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const tocData = await prisma.tocData.findUnique({
    where: { id: params.id },
  });
  if (!tocData) {
    return NextResponse.json({ error: '记录不存在' }, { status: 404 });
  }

  let body: { labels?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体格式错误' }, { status: 400 });
  }

  if (!Array.isArray(body.labels)) {
    return NextResponse.json({ error: 'labels 必须为字符串数组' }, { status: 400 });
  }

  try {
    const labels = await syncTocDataLabels(tocData.id, body.labels.map(String));
    return NextResponse.json({ success: true, labels });
  } catch (error) {
    console.error('更新标签失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新标签失败' },
      { status: 500 }
    );
  }
}
