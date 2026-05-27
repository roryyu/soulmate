/**
 * Embedding 测试脚本
 * 运行方式: npx tsx scripts/test-embedding.ts
 */
import { createEmbedding, embedText, getAIProvider, getEmbeddingModel } from '@/lib/ai'

async function testTextEmbedding() {
  console.log('\n========== 测试文本向量化 ==========')
  console.log(`当前提供商: ${getAIProvider()}`)
  console.log(`Embedding 模型: ${getEmbeddingModel()}`)

  const texts = [
    '天很蓝，海很深',
    '人工智能是未来的发展方向',
    '今天天气真好'
  ]

  try {
    const embeddings = await createEmbedding(texts)
    console.log(`\n✅ 成功! 生成了 ${embeddings.length} 个向量`)
    embeddings.forEach((embedding, idx) => {
      console.log(`  向量 ${idx + 1}: ${embedding.slice(0, 5).join(', ')}... (共 ${embedding.length} 维)`)
    })
    return embeddings
  } catch (error) {
    console.error('❌ 文本向量化失败:', error)
    throw error
  }
}

async function testMultimodalEmbedding() {
  console.log('\n========== 测试多模态向量化 ==========')

  const multimodalInput = [
    {
      type: 'text' as const,
      text: '天很蓝，海很深'
    },
    {
      type: 'image_url' as const,
      image_url: {
        url: 'https://ark-project.tos-cn-beijing.volces.com/images/view.jpeg'
      }
    }
  ]

  try {
    const embeddings = await createEmbedding(multimodalInput)
    console.log(`\n✅ 成功! 生成了 ${embeddings.length} 个向量`)
    embeddings.forEach((embedding, idx) => {
      console.log(`  向量 ${idx + 1}: ${embedding.slice(0, 5).join(', ')}... (共 ${embedding.length} 维)`)
    })
    return embeddings
  } catch (error) {
    console.error('❌ 多模态向量化失败:', error)
    throw error
  }
}

async function main() {
  console.log('========================================')
  console.log('         Embedding API 测试')
  console.log('========================================')

  // 测试单文本
  try {
    const singleText = await embedText('你好世界')
    console.log('\n✅ 单文本向量化成功!')
    console.log(`  向量维度: ${singleText[0].length}`)
  } catch (error) {
    console.error('❌ 单文本向量化失败')
  }

  // 测试多文本
  await testTextEmbedding()

  // 如果是 ARK 提供商，测试多模态
  if (getAIProvider() === 'ark') {
    await testMultimodalEmbedding()
  } else {
    console.log('\n⚠️ 当前不是 ARK 提供商，跳过多模态测试')
    console.log('   多模态 embedding 仅支持火山引擎 ARK')
  }

  console.log('\n========================================')
  console.log('         测试完成')
  console.log('========================================\n')
}

main().catch(console.error)
