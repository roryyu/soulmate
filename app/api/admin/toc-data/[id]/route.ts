import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { deleteFile } from '@/lib/oss';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = process.env.TOS_BUCKET || 'soulmate';

export async function GET(
  _request: NextRequest,
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

  return NextResponse.json({ success: true, tocData });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const existing = await prisma.tocData.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json({ error: '记录不存在' }, { status: 404 });
  }

  if (existing.key) {
    try {
      await deleteFile({
        bucket: BUCKET_NAME,
        key: existing.key,
      });
    } catch (error) {
      console.error('删除 TOS 文件失败:', error);
    }
  }

  await prisma.$transaction([
    prisma.researchProject.deleteMany({ where: { tocDataId: params.id } }),
    prisma.tocData.delete({ where: { id: params.id } }),
  ]);

  return NextResponse.json({ success: true, message: '记录已删除' });
}
