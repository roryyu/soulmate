import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/oss';
import { v4 as uuidv4 } from 'uuid';
import { generateLabelsFromFileName, syncTocDataLabels } from '@/lib/toc-data-labels';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BUCKET_NAME = process.env.TOS_BUCKET || 'soulmate';
const FOLDER_PREFIX = 'toc-data/';

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const list = await prisma.tocData.findMany({
    orderBy: { createdAt: 'desc' },
    include: { tocDataLabels: { include: { label: true } } },
  });

  const tocDataList = list.map(({ tocDataLabels, ...item }) => ({
    ...item,
    labels: tocDataLabels.map((t) => ({ id: t.label.id, name: t.label.name })),
  }));

  return NextResponse.json({ success: true, tocDataList });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '请选择要上传的文件' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileId = uuidv4();
    const fileExtension = file.name.split('.').pop() || '';
    const key = `${FOLDER_PREFIX}${fileId}${fileExtension ? '.' + fileExtension : ''}`;
    const name = file.name.split('.')[0];
    
    const uploadResult = await uploadFile({
      bucket: BUCKET_NAME,
      key,
      body: buffer,
      contentType: file.type || 'application/octet-stream',
    });

    const tocData = await prisma.tocData.create({
      data: {
        id: fileId,
        key: uploadResult.key,
        etag: uploadResult.etag,
        name,
      },
    });

    // 用文件名请求大模型自动生成标签（失败不阻断上传）
    let labels: Array<{ id: string; name: string }> = [];
    try {
      const generated = await generateLabelsFromFileName(
        file.name,
        auth.session.user.id,
        auth.session.user.name
      );
      if (generated.length > 0) {
        labels = await syncTocDataLabels(tocData.id, generated);
      }
    } catch (error) {
      console.error('自动生成标签失败:', error);
    }

    return NextResponse.json({ success: true, tocData: { ...tocData, labels } });
  } catch (error) {
    console.error('上传文件错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '上传文件失败' },
      { status: 500 }
    );
  }
}
