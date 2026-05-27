import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * 获取所有反馈类型列表（公开接口，不需要管理员权限）
 * 用于用户提交反馈时选择类型
 */
export async function GET(request: NextRequest) {
  try {
    const types = await prisma.feedbackType.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ types });
  } catch (error) {
    console.error('获取反馈类型失败:', error);
    return NextResponse.json({ error: '获取失败，请重试' }, { status: 500 });
  }
}
