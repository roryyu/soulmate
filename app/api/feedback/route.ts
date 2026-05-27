import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();

    const { typeId, title, description, userEmail, userPhone, attachments } = body;

    if (!typeId || !title || !description) {
      return NextResponse.json({ error: '请填写必要字段' }, { status: 400 });
    }

    // 验证问题类型是否存在
    const feedbackType = await prisma.feedbackType.findUnique({
      where: { id: typeId },
    });

    if (!feedbackType) {
      return NextResponse.json({ error: '问题类型不存在' }, { status: 400 });
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: session?.user?.id,
        userName: session?.user?.name || '游客',
        userEmail: userEmail || session?.user?.email,
        userPhone: userPhone || (session?.user as any)?.phone,
        typeId,
        title,
        description,
        attachments: attachments ? JSON.stringify(attachments) : undefined,
      },
    });

    // 记录初始状态
    await prisma.feedbackStatus.create({
      data: {
        feedbackId: feedback.id,
        oldStatus: '',
        newStatus: 'PENDING',
      },
    });

    return NextResponse.json({ success: true, feedback }, { status: 201 });
  } catch (error) {
    console.error('提交反馈失败:', error);
    return NextResponse.json({ error: '提交失败，请重试' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: '请登录后查看' }, { status: 401 });
    }

    const feedbacks = await prisma.feedback.findMany({
      where: { userId: session.user.id },
      include: {
        type: true,
        replies: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ feedbacks });
  } catch (error) {
    console.error('获取反馈列表失败:', error);
    return NextResponse.json({ error: '获取失败，请重试' }, { status: 500 });
  }
}