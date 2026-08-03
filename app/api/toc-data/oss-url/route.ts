import { NextRequest, NextResponse } from 'next/server';
import { getPresignedUrl } from '@/lib/oss';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = process.env.OSS_BUCKET || 'soulmate-music';

// 将 oss://bucket/key 地址转换为可访问的预签名 URL
export async function GET(request: NextRequest) {
  const uri = request.nextUrl.searchParams.get('uri');

  if (!uri || !uri.startsWith('oss://')) {
    return NextResponse.json({ error: '请提供有效的 oss:// 地址' }, { status: 400 });
  }

  const [bucket, ...keyParts] = uri.slice('oss://'.length).split('/');
  const key = keyParts.join('/');

  if (!bucket || !key) {
    return NextResponse.json({ error: 'oss:// 地址格式不正确' }, { status: 400 });
  }
  if (bucket !== BUCKET_NAME) {
    return NextResponse.json({ error: '不支持的存储桶' }, { status: 400 });
  }

  try {
    // 生成预签名 URL（24小时有效期）
    const url = await getPresignedUrl(bucket, key, 24 * 3600);
    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('获取 OSS 访问地址错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取访问地址失败' },
      { status: 500 }
    );
  }
}
