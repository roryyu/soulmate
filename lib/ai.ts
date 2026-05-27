import OpenAI from "openai";
import { prisma } from './prisma';

/**
 * 向量嵌入输入类型
 */
export interface EmbeddingInput {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
  }
}

/**
 * 向量嵌入结果
 */
export interface EmbeddingResult {
  object: string
  embedding: number[]
  index: number
}

/**
 * AI 服务提供商类型
 */
export type AIProvider = 'deepseek' | 'ark';

/**
 * 获取当前使用的 AI 提供商
 * 通过 AI_PROVIDER 环境变量配置，支持 'deepseek'（默认）或 'ark'（火山引擎）
 */
export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === 'ark') return 'ark';
  return 'deepseek';
}

/**
 * 根据提供商获取对应的 AI 客户端配置
 */
function getAIConfig() {
  const provider = getAIProvider();

  switch (provider) {
    case 'ark':
      return {
        apiKey: process.env.ARK_API_KEY,
        baseURL: process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
      };
    case 'deepseek':
    default:
      return {
        apiKey: process.env.AI_API_KEY,
        baseURL: process.env.AI_BASE_URL || 'https://api.deepseek.com/v1',
      };
  }
}

/**
 * 获取当前使用的模型
 * 根据 AI 提供商自动选择对应的默认模型
 */
export function getDefaultModel(): string {
  const provider = getAIProvider();

  switch (provider) {
    case 'ark':
      return process.env.ARK_MODEL || 'doubao-pro-32k-2411';
    case 'deepseek':
    default:
      return process.env.AI_MODEL || 'deepseek-chat';
  }
}

// 延迟初始化 AI 客户端，避免在构建时就需要 API Key
let _aiClient: OpenAI | null = null;
export function getAIClient(): OpenAI {
  if (!_aiClient) {
    const aiConfig = getAIConfig();
    if (!aiConfig.apiKey) {
      throw new Error('Missing credentials. Please pass an `apiKey`, or set the `AI_API_KEY` or `ARK_API_KEY` environment variable.');
    }
    _aiClient = new OpenAI({
      apiKey: aiConfig.apiKey,
      baseURL: aiConfig.baseURL,
    });
  }
  return _aiClient;
}

// 导出当前模型（保持向后兼容）
export const AI_MODEL = getDefaultModel();

/**
 * 保存对话记录到数据库
 */
async function saveConversation(params: {
  userId?: string | null
  userName?: string | null
  module: string
  model: string
  prompt: string
  response?: string | null
  tokens?: number | null
  duration: number
  error?: string | null
  metadata?: Record<string, unknown> | null
}) {
  try {
    await prisma.aIConversation.create({
      data: {
        userId: params.userId,
        userName: params.userName,
        module: params.module,
        model: params.model,
        prompt: params.prompt,
        response: params.response,
        tokens: params.tokens,
        duration: params.duration,
        error: params.error,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    // 记录保存失败不影响主流程
    console.error('保存对话记录失败:', error);
  }
}

/**
 * 带日志记录的聊天完成API调用
 * 自动打印请求消息和大模型输出
 */
export async function chatWithLogging(
  options: {
    model: string
    messages: Array<{
      role: 'system' | 'user' | 'assistant'
      content: string
    }>
    temperature?: number
    max_tokens?: number
    response_format?: { type: 'json_object' | 'text' }
  },
  context?: {
    module: string  // 调用模块名称，如 "选题生成"、"文献分析" 等
    userId?: string | null // 当前用户ID（可选）
    userName?: string | null // 当前用户名（可选）
    metadata?: Record<string, unknown> // 额外元数据
  }
) {
  const moduleName = context?.module || 'AI'
  const startTime = Date.now()

  // 打印请求日志
  console.log('\n========== 🚀 大模型请求 ==========')
  console.log(`📌 模块: ${moduleName}`)
  console.log(`📌 模型: ${options.model}`)
  console.log('📌 请求消息:')
  options.messages.forEach((msg, idx) => {
    console.log(`   [${idx + 1}] ${msg.role.toUpperCase()}: ${msg.content}`)
  })
  console.log(`📌 参数: temperature=${options.temperature ?? 'default'}, max_tokens=${options.max_tokens ?? 'default'}, response_format=${options.response_format?.type ?? 'default'}`)
  console.log('===================================\n')

  try {
    const completion = await getAIClient().chat.completions.create({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      response_format: options.response_format,
    })

    const response = completion.choices[0]?.message?.content || ''
    const duration = Date.now() - startTime

    // 打印响应日志
    console.log('\n========== ✅ 大模型响应 ==========')
    console.log(`📌 模块：${moduleName}`)
    console.log(`📌 响应内容：${response}`)
    console.log(`📌 完成原因：${completion.choices[0]?.finish_reason}`)
    console.log(`📌 Token 使用情况：`, completion.usage)
    console.log('===================================\n')

    // 提取用户消息作为 prompt
    const userPrompt = options.messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n')

    // 提取 token 使用情况
    const tokens = completion.usage?.total_tokens ?? null

    // 记录到数据库
    await saveConversation({
      userId: context?.userId,
      userName: context?.userName,
      module: moduleName,
      model: options.model,
      prompt: userPrompt,
      response: response,
      tokens: tokens,
      duration,
      metadata: context?.metadata,
    })

    return completion
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    // 打印错误日志
    console.error('\n========== ❌ 大模型调用错误 ==========')
    console.error(`📌 模块: ${moduleName}`)
    console.error(`📌 错误: ${errorMessage}`)
    console.error('========================================\n')

    // 提取用户消息作为 prompt
    const userPrompt = options.messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n')

    // 记录错误到数据库
    await saveConversation({
      userId: context?.userId,
      userName: context?.userName,
      module: moduleName,
      model: options.model,
      prompt: userPrompt,
      error: errorMessage,
      duration,
      metadata: context?.metadata,
    })

    throw error
  }
}

/**
 * 带日志记录的流式聊天完成API调用
 * 使用 AsyncGenerator 逐块返回内容，支持 SSE 流式响应
 */
export async function* streamChatWithLogging(
  options: {
    model: string
    messages: Array<{
      role: 'system' | 'user' | 'assistant'
      content: string
    }>
    temperature?: number
    max_tokens?: number
    response_format?: { type: 'json_object' | 'text' }
  },
  context?: {
    module: string
    userId?: string | null
    userName?: string | null
    metadata?: Record<string, unknown>
  }
): AsyncGenerator<string, void, unknown> {
  const moduleName = context?.module || 'AI'
  const startTime = Date.now()
  // 中文注释：默认关闭流式“chunk 进度/长度”等调试日志；需要排查时设置 AI_STREAM_DEBUG=1
  const enableStreamDebugLog = process.env.AI_STREAM_DEBUG === '1'

  // 打印请求日志
  console.log('\n========== 🚀 大模型流式请求 ==========')
  console.log(`📌 模块: ${moduleName}`)
  console.log(`📌 模型: ${options.model}`)
  console.log('📌 请求消息:')
  options.messages.forEach((msg, idx) => {
    console.log(`   [${idx + 1}] ${msg.role.toUpperCase()}: ${msg.content}`)
  })
  console.log(`📌 参数: temperature=${options.temperature ?? 'default'}, max_tokens=${options.max_tokens ?? 'default'}, response_format=${options.response_format?.type ?? 'default'}`)
  console.log('=========================================\n')

  try {
      const stream = await getAIClient().chat.completions.create({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
        response_format: options.response_format,
        stream: true,
        stream_options: {
          include_usage: true,  // 显式要求返回 usage 信息
        },
      })

    let fullResponse = ''
    let totalTokens: number | undefined
    let chunkCount = 0

    if (enableStreamDebugLog) {
      console.log('\n========== 📊 开始接收流式数据 ==========')
    }
    for await (const chunk of stream) {
      chunkCount++
      const content = chunk.choices[0]?.delta?.content || ''
      if (content) {
        fullResponse += content
        yield content
      }
      
      // 记录每个 chunk 的 usage 信息（如果有）
      if (chunk.usage) {
        if (enableStreamDebugLog) {
          console.log(` 第 ${chunkCount} 个 chunk 包含 usage:`, JSON.stringify(chunk.usage))
        }
        totalTokens = chunk.usage.total_tokens
      } else if (enableStreamDebugLog && chunkCount % 10 === 0) {
        // 中文注释：每 10 个 chunk 打印一次进度，避免日志过多（仅调试模式开启）
        console.log(`📊 第 ${chunkCount} 个 chunk，当前响应长度：${fullResponse.length} 字符`)
      }
    }
    if (enableStreamDebugLog) {
      console.log('=========================================\n')
    }

    const duration = Date.now() - startTime

    // 打印响应日志（异步执行不阻塞流式返回）
    console.log('\n========== ✅ 大模型流式响应完成 ==========')
    console.log(`📌 模块：${moduleName}`)
    console.log(` 总 chunk 数量：${chunkCount}`)
    console.log(`📌 响应长度：${fullResponse.length} 字符`)
    console.log(`📌 Token 使用情况：`, totalTokens ?? '未获取到')
    console.log('===========================================\n')

    // 异步记录到数据库（不阻塞流式返回）
    const userPrompt = options.messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n')

    saveConversation({
      userId: context?.userId,
      userName: context?.userName,
      module: moduleName,
      model: options.model,
      prompt: userPrompt,
      response: fullResponse,
      tokens: totalTokens ?? null,
      duration,
      metadata: context?.metadata,
    }).catch(err => console.error('异步记录对话失败:', err))

  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    // 打印错误日志
    console.error('\n========== ❌ 大模型流式调用错误 ==========')
    console.error(`📌 模块: ${moduleName}`)
    console.error(`📌 错误: ${errorMessage}`)
    console.error('============================================\n')

    // 异步记录错误到数据库
    const userPrompt = options.messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n')

    saveConversation({
      userId: context?.userId,
      userName: context?.userName,
      module: moduleName,
      model: options.model,
      prompt: userPrompt,
      error: errorMessage,
      duration,
      metadata: context?.metadata,
    }).catch(err => console.error('异步记录错误失败:', err))

    throw error
  }
}

/**
 * 获取 Embedding 客户端配置
 */
function getEmbeddingConfig() {
  const provider = getAIProvider();

  switch (provider) {
    case 'ark':
      return {
        apiKey: process.env.ARK_API_KEY,
        baseURL: process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
      };
    case 'deepseek':
    default:
      return {
        apiKey: process.env.AI_API_KEY,
        baseURL: process.env.AI_BASE_URL || 'https://api.deepseek.com/v1',
      };
  }
}

// 延迟初始化 Embedding 客户端，避免在构建时就需要 API Key
let _embeddingClient: OpenAI | null = null;
export function getEmbeddingClient(): OpenAI {
  if (!_embeddingClient) {
    const embeddingConfig = getEmbeddingConfig();
    if (!embeddingConfig.apiKey) {
      throw new Error('Missing credentials. Please pass an `apiKey`, or set the `AI_API_KEY` or `ARK_API_KEY` environment variable.');
    }
    _embeddingClient = new OpenAI({
      apiKey: embeddingConfig.apiKey,
      baseURL: embeddingConfig.baseURL,
    });
  }
  return _embeddingClient;
}

/**
 * 获取 Embedding 模型
 */
export function getEmbeddingModel(): string {
  const provider = getAIProvider();

  switch (provider) {
    case 'ark':
      return process.env.ARK_TEXT_EMBEDDING_MODEL || 'doubao-embedding-text-250615';
    case 'deepseek':
    default:
      return process.env.AI_EMBEDDING_MODEL || 'deepseek-embedding';
  }
}

/**
 * 获取多模态 Embedding 模型（仅 ARK 支持）
 */
export function getMultimodalEmbeddingModel(): string {
  return process.env.ARK_EMBEDDING_MODEL || 'doubao-embedding-vision-250615';
}

/**
 * 文本向量化 - 支持纯文本或多模态（文本+图片）
 * @param input 文本字符串数组，或混合输入（文本+图片URL）
 * @param model 向量模型（可选，默认使用对应提供商的模型）
 * @returns 向量数组
 */
export async function createEmbedding(
  input: string[] | EmbeddingInput[],
  model?: string
): Promise<number[][]> {
  const provider = getAIProvider();

  console.log('\n========== 🔢 向量化请求 ==========')
  console.log(`📌 提供商: ${provider}`)
  console.log(`📌 输入数量: ${Array.isArray(input) ? input.length : 1}`)
  console.log('===================================\n')

  // 获取配置
  const embeddingConfig = getEmbeddingConfig();

  try {
    // 火山引擎：所有 embedding 都通过 /embeddings/multimodal 接口
    // 注意：火山引擎多模态接口每次只处理一个输入，需要循环处理
    if (provider === 'ark') {
      const arkModel = model || getMultimodalEmbeddingModel();
      console.log(`📌 模型: ${arkModel}`)

      const items = input as Array<string | EmbeddingInput>;
      const results: number[][] = [];

      // 逐个处理（火山引擎多模态接口限制）
      for (const item of items) {
        const arkInput = typeof item === 'string'
          ? [{ type: 'text' as const, text: item }]
          : [item as EmbeddingInput];

        const fetchResponse = await fetch(`${embeddingConfig.baseURL}/embeddings/multimodal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${embeddingConfig.apiKey}`,
          },
          body: JSON.stringify({
            model: arkModel,
            input: arkInput,
          }),
        });

        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          throw new Error(`Embedding API error: ${fetchResponse.status} - ${errorText}`);
        }

        const data = await fetchResponse.json();
        const embeddingData = (data as { data: { embedding: number[] } }).data;

        if (embeddingData && typeof embeddingData === 'object' && 'embedding' in embeddingData) {
          results.push((embeddingData as { embedding: number[] }).embedding);
        } else {
          throw new Error(`Invalid embedding response: ${JSON.stringify(data)}`);
        }
      }

      return results;
    } else {
      // DeepSeek 使用标准 embedding 接口
      const textModel = model || getEmbeddingModel();
      console.log(`📌 模型: ${textModel}`)

      const textInput = Array.isArray(input) ? input : [input];
      const response = await getEmbeddingClient().embeddings.create({
        model: textModel,
        input: textInput as string[],
      });

      return response.data.map((item: { embedding: number[] }) => item.embedding);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('\n========== ❌ 向量化错误 ==========')
    console.error(`📌 错误: ${errorMessage}`)
    console.error('====================================\n')
    throw error
  }
}

/**
 * 文本向量化（简写版本）
 */
export async function embedText(text: string | string[]): Promise<number[][]> {
  return createEmbedding(Array.isArray(text) ? text : [text]);
}
