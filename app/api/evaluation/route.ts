import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const settings = await prisma.evaluationSetting.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('获取评价设置失败:', error);
    return NextResponse.json({ error: '获取失败，请重试' }, { status: 500 });
  }
}
