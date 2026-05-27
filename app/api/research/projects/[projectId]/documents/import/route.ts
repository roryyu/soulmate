import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { processDocumentEmbedding } from '@/lib/embedding-utils'
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    // 验证用户身份
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 获取请求体数据
    const data = await request.json();
    const { documentIds } = data;
    const projectId = params.projectId;

    // 验证必填参数
    if (!projectId) {
      return NextResponse.json({ error: '项目ID不能为空' }, { status: 400 });
    }
    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ error: '文档ID列表不能为空' }, { status: 400 });
    }

    // 验证项目是否存在
    const project = await prisma.researchProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: '项目不存在' }, { status: 404 });
    }

    // 批量导入到ResearchDocument表
    const importResults = await prisma.$transaction(async (tx) => {
      const results = [];
      
      for (const documentId of documentIds) {
        // 检查是否已存在相同的文档关联
        const existingAssociation = await tx.researchDocument.findFirst({
          where: {
            projectId,
            documentId,
          },
        });

        if (existingAssociation) {
          results.push({
            documentId,
            status: 'skipped',
            message: '文档已存在于项目中',
          });
        } else {
          // 创建新的关联记录


          const newAssociation = await tx.researchDocument.create({
            data: {
              projectId,
              documentId,
              embeddingStatus: 'pending',
              embeddingProgress: 0,
            } as any,
          });
          // 触发异步向量化处理（不等待完成）
          setImmediate(async () => {
            try {
              await processDocumentEmbedding(newAssociation.id, async (progress, status) => {
                // 进度更新会直接保存到数据库
                console.log(`Document ${newAssociation.id} embedding progress: ${progress}% - ${status}`)
              })
            } catch (error) {
              console.error(`Failed to process embedding for document ${newAssociation.id}:`, error)
            }
          })          
          results.push({
            documentId,
            status: 'imported',
            researchDocumentId: newAssociation.id,
          });
        }
      }
      
      return results;
    });

    // 统计导入结果
    const importedCount = importResults.filter(r => r.status === 'imported').length;
    const skippedCount = importResults.filter(r => r.status === 'skipped').length;

    return NextResponse.json({
      success: true,
      message: `成功导入 ${importedCount} 个文档，跳过 ${skippedCount} 个已存在的文档`,
      results: importResults,
      importedCount,
      skippedCount,
      totalCount: documentIds.length,
    });
  } catch (error) {
    console.error('批量导入文档错误:', error);
    return NextResponse.json({ error: '批量导入文档失败' }, { status: 500 });
  }
}
