import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { downloadFile } from '@/lib/tos';

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

  if (!tocData.key) {
    return NextResponse.json({ error: '文件路径不存在' }, { status: 400 });
  }

  try {
    const result = await downloadFile({
      bucket: BUCKET_NAME,
      key: tocData.key,
    });

    const fileName = tocData.key.split('/').pop() || 'download';

    return new NextResponse(result.content, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': result.content.length.toString(),
      },
    });
  } catch (error) {
    console.error('下载文件错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '下载文件失败' },
      { status: 500 }
    );
  }
}
