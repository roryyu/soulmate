import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { downloadFile } from '@/lib/oss';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = process.env.TOS_BUCKET || 'soulmate';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, data } = body;

    if (!uid) {
      return NextResponse.json({ error: 'uid是必填参数' }, { status: 400 });
    }

    // 获取所有Prescription记录
    const prescriptions = await prisma.prescription.findMany({
      where: {
        key: {
          not: null,
        },
      },
    });

    if (prescriptions.length === 0) {
      return NextResponse.json({ error: '暂无可用的处方数据' }, { status: 404 });
    }

    // 随机选择一条（未来这里会接入大模型选择）
    const randomIndex = Math.floor(Math.random() * prescriptions.length);
    const prescription = prescriptions[randomIndex];

    if (!prescription.key) {
      return NextResponse.json({ error: '处方数据异常：缺少文件路径' }, { status: 500 });
    }

    // 从OSS下载文件
    const result = await downloadFile({
      bucket: BUCKET_NAME,
      key: prescription.key,
    });

    // 将Buffer转换为Uint8Array
    const contentArray = new Uint8Array(result.content);

    // 处理Range请求（支持音频拖拽）
    const range = request.headers.get('range');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : result.content.length - 1;
      const chunksize = end - start + 1;
      const chunk = contentArray.slice(start, end + 1);

      return new NextResponse(chunk, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${result.content.length}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': 'audio/mpeg',
        },
      });
    }

    // 返回完整音频流
    return new NextResponse(contentArray, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': result.content.length.toString(),
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    console.error('开放接口错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器内部错误' },
      { status: 500 }
    );
  }
}