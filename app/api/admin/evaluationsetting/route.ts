import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const settings = await prisma.evaluationSetting.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('获取评价设置失败:', error);
    return NextResponse.json({ error: '获取失败，请重试' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const { type, question, options, weight, order } = body;

    if (!question) {
      return NextResponse.json({ error: '请输入评价问题' }, { status: 400 });
    }

    const setting = await prisma.evaluationSetting.create({
      data: {
        type: type || null,
        question,
        options: options || null,
        weight: weight ? parseFloat(weight) : 1.0,
        order: order || 0,
      },
    });

    return NextResponse.json({ success: true, setting }, { status: 201 });
  } catch (error) {
    console.error('创建评价设置失败:', error);
    return NextResponse.json({ error: '创建失败，请重试' }, { status: 500 });
  }
}

// 批量导入评价设置
export async function PATCH(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const { settings } = body;

    if (!Array.isArray(settings) || settings.length === 0) {
      return NextResponse.json({ error: '请提供有效的评价设置数据' }, { status: 400 });
    }

    // 验证每条数据
    for (const item of settings) {
      if (!item.question) {
        return NextResponse.json({ error: '每条评价设置都必须包含问题' }, { status: 400 });
      }
    }

    // 批量创建
    const createdSettings = await Promise.all(
      settings.map((item: any) =>
        prisma.evaluationSetting.create({
          data: {
            type: item.type || null,
            question: item.question,
            options: item.options ? JSON.stringify(item.options) : null,
            weight: item.weight ? parseFloat(item.weight) : 1.0,
            order: item.order || 0,
          },
        })
      )
    );

    return NextResponse.json({ success: true, count: createdSettings.length, settings: createdSettings });
  } catch (error) {
    console.error('批量导入评价设置失败:', error);
    return NextResponse.json({ error: '批量导入失败，请重试' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { session, error } = await requireAdmin();
    if (error) return error;

    const body = await request.json();
    const { id, type, question, options, weight, order } = body;

    if (!id || !question) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const setting = await prisma.evaluationSetting.update({
      where: { id },
      data: {
        type: type || null,
        question,
        options: options || null,
        weight: weight ? parseFloat(weight) : 1.0,
        order: order || 0,
      },
    });

    return NextResponse.json({ success: true, setting });
  } catch (error) {
    console.error('更新评价设置失败:', error);
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

    await prisma.evaluationSetting.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除评价设置失败:', error);
    return NextResponse.json({ error: '删除失败，请重试' }, { status: 500 });
  }
}
