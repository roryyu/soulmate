/**
 * 解耦的 LLM Provider。
 *
 * 直接用 openai SDK + 环境变量构建，不 import lib/ai.ts —— 后者在模块顶层引入 prisma，
 * 会让技能运行器（以及它的 CLI 测试）被迫依赖数据库。这里的 provider/model/baseURL
 * 解析逻辑与 lib/ai.ts 保持一致（AI_PROVIDER / AI_API_KEY / AI_BASE_URL / AI_MODEL / ARK_*）。
 */
import OpenAI from 'openai';
import type { LLMCompleteOptions, LLMProvider } from './types';

export type AIProviderName = 'deepseek' | 'ark';

export interface LLMProviderConfig {
  apiKey?: string;
  baseURL?: string;
  model?: string;
  provider?: AIProviderName;
}

/** 读取当前 provider 名称（与 lib/ai.ts 一致） */
export function resolveProviderName(explicit?: string): AIProviderName {
  const p = (explicit ?? process.env.AI_PROVIDER ?? '').toLowerCase();
  if (p === 'ark') return 'ark';
  return 'deepseek';
}

/** 解析 provider 对应的 apiKey / baseURL */
function resolveConfig(provider: AIProviderName): { apiKey?: string; baseURL?: string } {
  if (provider === 'ark') {
    return {
      apiKey: process.env.ARK_API_KEY,
      baseURL: process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
    };
  }
  return {
    apiKey: process.env.AI_API_KEY,
    baseURL: process.env.AI_BASE_URL || 'https://api.deepseek.com/v1',
  };
}

/** 解析默认模型名（与 lib/ai.ts 一致） */
export function resolveModel(provider: AIProviderName, override?: string): string {
  if (override) return override;
  if (provider === 'ark') return process.env.ARK_MODEL || 'doubao-pro-32k-2411';
  return process.env.AI_MODEL || 'deepseek-chat';
}

/**
 * 创建一个 LLMProvider。
 * @param config 可覆盖 apiKey / baseURL / model / provider；缺省时全部读环境变量
 */
export function createLLMProvider(config: LLMProviderConfig = {}): LLMProvider {
  const provider = resolveProviderName(config.provider);
  const resolved = resolveConfig(provider);
  const apiKey = config.apiKey ?? resolved.apiKey;
  const baseURL = config.baseURL ?? resolved.baseURL;
  const model = resolveModel(provider, config.model);

  if (!apiKey) {
    // 延迟到调用时抛错，避免 import 阶段就失败
    return {
      async complete() {
        throw new Error(
          '缺少 LLM API Key：请在 .env 设置 AI_API_KEY（或 ARK_API_KEY，当 AI_PROVIDER=ark 时）'
        );
      },
    };
  }

  const client = new OpenAI({ apiKey, baseURL });

  return {
    async complete(messages, options?: LLMCompleteOptions): Promise<string> {
      const finalMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
      if (options?.systemPrompt) {
        finalMessages.push({ role: 'system', content: options.systemPrompt });
      }
      finalMessages.push(...messages);

      const requestParams: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
        model,
        messages: finalMessages,
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxTokens ?? 4096,
      };
      if (options?.jsonMode) {
        requestParams.response_format = { type: 'json_object' };
      }

      try {
        const completion = await client.chat.completions.create(requestParams);
        return completion.choices[0]?.message?.content ?? '';
      } catch (err: unknown) {
        // 某些模型/网关不支持 response_format，去掉后重试一次
        const message = err instanceof Error ? err.message : String(err);
        if (options?.jsonMode && /response_format|json_object|response format/i.test(message)) {
          delete requestParams.response_format;
          const retry = await client.chat.completions.create(requestParams);
          return retry.choices[0]?.message?.content ?? '';
        }
        throw err;
      }
    },
  };
}

/**
 * 稳健地从 LLM 文本里抽取 JSON 对象。
 * 兼容：纯 JSON、```json 代码块包裹、前后夹带解释文字。
 */
export function extractJsonObject<T = Record<string, unknown>>(text: string): T | null {
  if (!text) return null;
  const trimmed = text.trim();

  // 1) 代码块包裹
  const fence = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
  const candidates: string[] = [];
  if (fence) candidates.push(fence[1].trim());
  candidates.push(trimmed);

  for (const cand of candidates) {
    // 直接解析
    try {
      return JSON.parse(cand) as T;
    } catch {
      // 继续尝试提取首个平衡对象
    }
    const obj = sliceFirstBalancedObject(cand);
    if (obj) {
      try {
        return JSON.parse(obj) as T;
      } catch {
        // 尝试下一个候选
      }
    }
  }
  return null;
}

/** 截取字符串里首个平衡的 {...} 片段（忽略字符串内的大括号） */
function sliceFirstBalancedObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}
