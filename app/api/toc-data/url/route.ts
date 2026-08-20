import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPresignedUrl } from '@/lib/oss';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = process.env.TOS_BUCKET || 'soulmate';

// 根据名称获取音乐文件的预签名 URL
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: '请提供音乐名称' }, { status: 400 });
  }

  try {
    // 根据名称查找 TocData
    const tocData = await prisma.tocData.findFirst({
      where: {
        name: {
          contains: name,
          mode: 'insensitive',
        },
      },
    });

    if (!tocData) {
      return NextResponse.json({ error: '未找到对应的音乐文件' }, { status: 404 });
    }

    if (!tocData.key) {
      return NextResponse.json({ error: '音乐文件路径不存在' }, { status: 400 });
    }

    // 生成预签名 URL（24小时有效期）
    const url = await getPresignedUrl(BUCKET_NAME, tocData.key, 24 * 3600);

    return NextResponse.json({
      success: true,
      url,
      name: tocData.name,
    });
  } catch (error) {
    console.error('获取音乐 URL 错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取音乐 URL 失败' },
      { status: 500 }
    );
  }
}
