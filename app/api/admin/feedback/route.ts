import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const typeId = searchParams.get('typeId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    const where: any = {};
    if (status) where.status = status;
    if (typeId) where.typeId = typeId;

    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          type: true,
          user: { select: { name: true, email: true, phone: true } },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: { user: { select: { name: true, role: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.feedback.count({ where }),
    ]);

    return NextResponse.json({ feedbacks, total, page, pageSize });
  } catch (error) {
    console.error('获取反馈列表失败:', error);
    return NextResponse.json({ error: '获取失败，请重试' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const { action, feedbackId, ...data } = body;

    if (!action || !feedbackId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    switch (action) {
      case 'updateStatus': {
        const { status } = data;
        if (!status) {
          return NextResponse.json({ error: '请指定状态' }, { status: 400 });
        }

        const feedback = await prisma.feedback.findUnique({
          where: { id: feedbackId },
        });

        if (!feedback) {
          return NextResponse.json({ error: '反馈不存在' }, { status: 404 });
        }

        const updateData: any = { status };
        if (status === 'COMPLETED') {
          updateData.resolvedAt = new Date();
        } else if (status === 'CLOSED') {
          updateData.closedAt = new Date();
        }

        const updatedFeedback = await prisma.feedback.update({
          where: { id: feedbackId },
          data: updateData,
        });

        // 记录状态变更
        await prisma.feedbackStatus.create({
          data: {
            feedbackId,
            oldStatus: feedback.status,
            newStatus: status,
            changedBy: (session as any).user?.id,
          },
        });

        return NextResponse.json({ success: true, feedback: updatedFeedback });
      }

      case 'assign': {
        const { assignedTo } = data;
        if (!assignedTo) {
          return NextResponse.json({ error: '请指定分配人' }, { status: 400 });
        }

        const updatedFeedback = await prisma.feedback.update({
          where: { id: feedbackId },
          data: { assignedTo },
        });

        return NextResponse.json({ success: true, feedback: updatedFeedback });
      }

      case 'reply': {
        const { content } = data;
        if (!content) {
          return NextResponse.json({ error: '请输入回复内容' }, { status: 400 });
        }

        // 获取当前反馈状态
        const feedback = await prisma.feedback.findUnique({
          where: { id: feedbackId },
        });

        if (!feedback) {
          return NextResponse.json({ error: '反馈不存在' }, { status: 404 });
        }

        // 创建回复
        const reply = await prisma.feedbackReply.create({
          data: {
            feedbackId,
            userId: (session as any).user?.id,
            userName: (session as any).user?.name || '管理员',
            content,
            isAdmin: true,
          },
        });

        // 如果当前状态是待处理，自动改为处理中
        let newStatus = feedback.status;
        if (feedback.status === 'PENDING') {
          newStatus = 'PROCESSING';
          await prisma.feedback.update({
            where: { id: feedbackId },
            data: { status: 'PROCESSING' },
          });

          // 记录状态变更
          await prisma.feedbackStatus.create({
            data: {
              feedbackId,
              oldStatus: feedback.status,
              newStatus: 'PROCESSING',
              changedBy: (session as any).user?.id,
            },
          });
        }

        return NextResponse.json({ success: true, reply, newStatus });
      }

      default:
        return NextResponse.json({ error: '无效操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('处理反馈失败:', error);
    return NextResponse.json({ error: '处理失败，请重试' }, { status: 500 });
  }
}
