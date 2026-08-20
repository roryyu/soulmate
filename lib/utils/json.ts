/**
 * 清理并解析大模型返回的 JSON 字符串
 * 大模型返回的 JSON 可能带有格式（换行、缩进等），需要特殊处理
 */
export function parseLLMJson<T>(jsonString: string): T {
  if (!jsonString || typeof jsonString !== 'string') {
    throw new Error('输入的 JSON 字符串为空或格式不正确')
  }

  // 1. 首先尝试直接解析（如果已经是干净的 JSON）
  try {
    return JSON.parse(jsonString)
  } catch {
    // 如果直接解析失败，继续下面的清理步骤
  }

  // 2. 提取 JSON 内容（去除可能的 markdown 代码块标记）
  let cleaned = jsonString.trim()
  
  // 去除 ```json 和 ``` 标记
  cleaned = cleaned.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '')
  
  // 3. 提取 JSON 数组或对象（防止前后有其他内容）
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
  const objectMatch = cleaned.match(/\{[\s\S]*\}/)
  
  if (arrayMatch) {
    cleaned = arrayMatch[0]
  } else if (objectMatch) {
    cleaned = objectMatch[0]
  }

  // 4. 尝试解析清理后的 JSON
  try {
    return JSON.parse(cleaned)
  } catch (error) {
    console.error('JSON 解析失败:', {
      original: jsonString,
      cleaned,
      error
    })
    throw new Error(`JSON 解析失败：${error instanceof Error ? error.message : '未知错误'}`)
  }
}

/**
 * 安全地解析大模型返回的 JSON，如果失败则返回默认值
 */
export function safeParseLLMJson<T>(jsonString: string, defaultValue: T): T {
  try {
    return parseLLMJson<T>(jsonString)
  } catch {
    return defaultValue
  }
}
