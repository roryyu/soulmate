import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const types = await prisma.feedbackType.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ types });
  } catch (error) {
    console.error('获取反馈类型失败:', error);
    return NextResponse.json({ error: '获取失败，请重试' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const { name, description, sortOrder } = body;

    if (!name) {
      return NextResponse.json({ error: '请输入类型名称' }, { status: 400 });
    }

    const type = await prisma.feedbackType.create({
      data: {
        name,
        description,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json({ success: true, type }, { status: 201 });
  } catch (error) {
    console.error('创建反馈类型失败:', error);
    return NextResponse.json({ error: '创建失败，请重试' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const { id, name, description, sortOrder } = body;

    if (!id || !name) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const type = await prisma.feedbackType.update({
      where: { id },
      data: {
        name,
        description,
        sortOrder,
      },
    });

    return NextResponse.json({ success: true, type });
  } catch (error) {
    console.error('更新反馈类型失败:', error);
    return NextResponse.json({ error: '更新失败，请重试' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少 ID 参数' }, { status: 400 });
    }

    // 检查是否有反馈使用此类型
    const feedbackCount = await prisma.feedback.count({ where: { typeId: id } });
    if (feedbackCount > 0) {
      return NextResponse.json({ error: '该类型下存在反馈，无法删除' }, { status: 400 });
    }

    await prisma.feedbackType.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除反馈类型失败:', error);
    return NextResponse.json({ error: '删除失败，请重试' }, { status: 500 });
  }
}
