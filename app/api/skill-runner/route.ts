import { NextRequest, NextResponse } from 'next/server';
import { runSkillTask, listSkills } from '@/lib/skill-runner';

/**
 * 通用技能运行器 API。
 *
 * GET  /api/skill-runner            列出可用技能
 * POST /api/skill-runner            用自然语言提示词驱动一个技能完成任务
 *      body: { prompt: string, skill?: string, maxIterations?: number, context?: string }
 *
 * 说明：涉及子进程与文件系统，必须使用 nodejs runtime（非 edge）。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// 给 agentic loop 足够的执行时间（自托管/长任务）
export const maxDuration = 300;

export async function GET() {
  try {
    const skills = await listSkills();
    return NextResponse.json({
      status: 'ok',
      count: skills.length,
      skills: skills.map((s) => ({ name: s.name, description: s.description, dir: s.dir })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: {
    prompt?: string;
    skill?: string;
    maxIterations?: number;
    commandTimeoutMs?: number;
    context?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', message: '请求体不是合法 JSON' }, { status: 400 });
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) {
    return NextResponse.json({ status: 'error', message: '缺少 prompt' }, { status: 400 });
  }

  try {
    const result = await runSkillTask(prompt, {
      skill: body.skill,
      maxIterations: body.maxIterations,
      commandTimeoutMs: body.commandTimeoutMs,
      context: body.context,
    });
    return NextResponse.json({ status: 'ok', data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}
