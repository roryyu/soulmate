// QAWF · 测量结果上报接口（只接收指标 JSON，不接收视频）
// 预留：后续可在此持久化，并调用 LLM 生成自然语言健康解读报告。

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const keys = body && typeof body === 'object' ? Object.keys(body) : [];
  console.log('[report] 收到测量结果字段：', keys);
  return NextResponse.json({ ok: true, receivedAt: Date.now() });
}
