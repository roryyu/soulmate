import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AI_MODEL, streamChatWithLogging } from '@/lib/ai'
import { READING_PROMPTS } from '@/lib/prompts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120 // 设置最大执行时间为120秒

/**
 * AI分析文献 - SSE流式响应
 * POST /api/research/projects/[projectId]/references/analyze
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const data = await request.json()
        const { fileName, content } = data

        if (!fileName || !content) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: '缺少必填字段' })}\n\n`))
          controller.close()
          return
        }

        // 获取课题信息用于上下文
        const project = await prisma.researchProject.findUnique({
          where: { id: params.projectId },
          select: {
            userId: true,
            title: true,
            field: true,
            user: { select: { name: true } },
          },
        })

        if (!project) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: '项目不存在' })}\n\n`))
          controller.close()
          return
        }

        // 发送开始消息
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`))

        const prompt = READING_PROMPTS.ANALYZE_USER(
          content,
          `${project.title} - ${project.field} (文件名: ${fileName})`
        )

        let fullResponse = ''

        // 使用流式 API
        for await (const chunk of streamChatWithLogging(
          {
            model: AI_MODEL,
            messages: [
              {
                role: 'system',
                content: READING_PROMPTS.ANALYZE_SYSTEM,
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.3,
          },
          { module: '文献分析', userId: project.userId, userName: project.user.name }
        )) {
          fullResponse += chunk
          const message = JSON.stringify({ type: 'chunk', data: chunk })
          controller.enqueue(encoder.encode(`data: ${message}\n\n`))
        }

        // 解析 AI 返回的内容
        const summaryMatch = fullResponse.match(/## 文献摘要\n([\s\S]*?)(?=##|$)/)
        const innovationMatch = fullResponse.match(/## 创新点\n([\s\S]*?)(?=##|$)/)
        const methodologyMatch = fullResponse.match(/## 研究方法\n([\s\S]*?)(?=##|$)/)
        const keyPagesMatch = fullResponse.match(/## 关键页码\n([\s\S]*?)(?=##|$)/)

        const summary = summaryMatch ? summaryMatch[1].trim() : '无法生成摘要'
        const innovationPoints = innovationMatch ? innovationMatch[1].trim() : '无法提取创新点'
        const methodology = methodologyMatch ? methodologyMatch[1].trim() : null
        const keyPages = keyPagesMatch ? keyPagesMatch[1].trim() : null

        // 发送完成消息
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'done',
          summary,
          innovationPoints,
          methodology: methodology || null,
          keyPages: keyPages || null
        })}\n\n`))
        controller.close()
      } catch (error) {
        console.error('分析文献错误:', error)
        const errorMessage = error instanceof Error ? error.message : '分析文献失败'
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`))
        controller.error(error)
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
