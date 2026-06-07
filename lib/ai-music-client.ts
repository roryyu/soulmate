/**
 * AI 音乐控制客户端 - 通过自然语言控制音乐截取和拼接
 */

import { chatWithLogging, AI_MODEL } from './ai';
import { controlMusic, MusicControlRequest, MusicFileConfig } from './music-control';
import { prisma } from '@/lib/prisma';
import { downloadFile } from '@/lib/tos';

/**
 * 音乐文件信息（用于AI解析）
 */
export interface MusicFileInfo {
  id: string;           // 文件标识符
  name: string;         // 文件名称
  duration?: number;    // 文件时长（秒）
  base64Data: string;   // base64 数据
}

/**
 * AI 音乐控制请求
 */
export interface AIMusicControlRequest {
  instruction: string;            // 用户的自然语言指令
  musicFiles: MusicFileInfo[];    // 可用的音乐文件列表
  totalDuration?: number;         // 期望的总时长（秒），可选
  userId?: string | null;         // 用户ID（用于日志记录）
  userName?: string | null;       // 用户名（用于日志记录）
}

/**
 * AI 解析结果
 */
interface AIAnalysisResult {
  files: Array<{
    id: string;              // 对应输入的文件ID
    startTime?: number;      // 截取开始时间（秒）
    endTime?: number;        // 截取结束时间（秒）
    insertTime: number;      // 插入时间点（秒）
    repeatInterval?: number; // 循环间隔（秒）
    isBackground?: boolean;  // 是否为背景曲
  }>;
  totalDuration?: number; // 建议的总时长
  explanation: string;    // AI 的解释说明
}

/**
 * 系统提示词 - 指导大模型如何解析音乐控制指令
 */
const MUSIC_CONTROL_SYSTEM_PROMPT = `你是一个专业的音乐编辑助手。你的任务是将用户的自然语言指令转化为精确的音乐编辑参数。

## 你的能力
1. 理解用户的音乐编辑意图
2. 根据音乐文件的时长信息，计算合理的截取和插入时间点
3. 输出结构化的 JSON 参数

## 输出格式
你必须输出一个严格的 JSON 对象，格式如下：
{
  "files": [
    {
      "id": "文件ID",
      "startTime": 0,           // 截取开始时间（秒），可选，默认为0
      "endTime": 30,            // 截取结束时间（秒），可选，默认使用文件完整时长
      "insertTime": 0,          // 在最终音轨中的插入开始时间（秒），必填
      "repeatInterval": 10,     // 循环间隔（秒），可选，设置后会每隔指定秒数重复插入，直到曲目结束
      "isBackground": false     // 是否为背景曲（贯穿整个音乐，音量较低），可选，默认false
    }
  ],
  "totalDuration": 90,          // 建议的总时长（秒），可选
  "explanation": "简要说明你的编辑方案"
}

## 常见指令模式

### 1. 背景曲 + 定时插入
用户指令示例："背景曲是素材1，素材2在1分30秒插入"
解析结果：
- 素材1：isBackground=true, insertTime=0
- 素材2：insertTime=90

### 2. 背景曲 + 循环插入
用户指令示例："背景曲是素材1，素材2在30秒插入，每隔20秒出现一次，直到曲目结束"
解析结果：
- 素材1：isBackground=true, insertTime=0
- 素材2：insertTime=30, repeatInterval=20

### 3. 多素材按时间排列
用户指令示例："素材1作为开头，素材2在30秒插入，素材3在1分钟插入"
解析结果：
- 素材1：insertTime=0
- 素材2：insertTime=30
- 素材3：insertTime=60

### 4. 指定截取片段
用户指令示例："素材1取前30秒，素材2从10秒到40秒"
解析结果：
- 素材1：startTime=0, endTime=30
- 素材2：startTime=10, endTime=40

## 规则
1. 文件ID必须与提供的文件列表中的ID完全匹配
2. 时间参数单位为秒
3. 如果用户说"x分x秒"，需要转换为秒（如1分30秒=90秒）
4. 如果用户没有指定截取时间，可以使用整个文件（不设置startTime和endTime）
5. 如果用户没有指定插入时间，按照文件顺序依次排列
6. 考虑文件的实际时长，避免截取时间超出文件范围
7. 如果用户的指令不明确，做出合理的默认选择
8. 背景曲（isBackground=true）会贯穿整个音乐，音量较低
9. 设置repeatInterval后，素材会从insertTime开始，每隔repeatInterval秒重复插入，直到曲目结束
10. 只输出 JSON，不要输出其他内容`;

/**
 * 构建用户消息
 */
function buildUserMessage(request: AIMusicControlRequest): string {
  const fileList = request.musicFiles.map((file, index) => {
    return `${index + 1}. [${file.id}] ${file.name}${file.duration ? ` (时长: ${file.duration}秒)` : ''}`;
  }).join('\n');

  let message = `## 可用的音乐文件
${fileList}

## 用户指令
${request.instruction}`;

  if (request.totalDuration) {
    message += `\n\n## 期望的总时长
${request.totalDuration}秒`;
  }

  return message;
}

/**
 * 解析 AI 返回的 JSON
 */
function parseAIResponse(response: string): AIAnalysisResult {
  try {
    // 尝试提取 JSON（处理可能的 markdown 代码块）
    let jsonStr = response.trim();
    
    // 移除可能的 markdown 代码块标记
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    const result = JSON.parse(jsonStr);
    
    // 验证基本结构
    if (!result.files || !Array.isArray(result.files)) {
      throw new Error('AI 返回的格式不正确：缺少 files 数组');
    }
    
    return result as AIAnalysisResult;
  } catch (error) {
    throw new Error(`解析 AI 响应失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 将 AI 解析结果转化为音乐控制参数
 */
async function convertToControlRequest(
  analysis: AIAnalysisResult,
  musicFiles: MusicFileInfo[],
  requestedDuration?: number
): Promise<MusicControlRequest> {
  const BUCKET_NAME = process.env.TOS_BUCKET || 'soulmate';
  const musicFileConfigs: MusicFileConfig[] = [];

  for (const fileInfo of analysis.files) {
    const file = musicFiles.find(f => f.id === fileInfo.id);
    if (!file) {
      console.warn(`⚠️ 找不到文件: ${fileInfo.id}`);
      continue;
    }

    // 通过 tocData 获取文件 key
    const tocData = await prisma.tocData.findUnique({
      where: { id: file.id },
    });

    if (!tocData?.key) {
      console.warn(`⚠️ 音频文件不存在或无 key: ${file.id}`);
      continue;
    }

    // 从 TOS 下载文件
    const result = await downloadFile({
      bucket: BUCKET_NAME,
      key: tocData.key,
    });
    const base64data = result.content.toString('base64');

    musicFileConfigs.push({
      fileData: base64data,
      startTime: fileInfo.startTime,
      endTime: fileInfo.endTime,
      insertTime: fileInfo.insertTime,
      repeatInterval: fileInfo.repeatInterval,
      isBackground: fileInfo.isBackground,
    });
  }

  return {
    musicFiles: musicFileConfigs,
    duration: requestedDuration || analysis.totalDuration,
  };
}

/**
 * AI 音乐控制主函数
 * 通过自然语言指令控制音乐的截取和拼接
 * 
 * @param request AI 音乐控制请求
 * @returns 合并后的音乐文件 base64 字符串
 * 
 * @example
 * ```typescript
 * const result = await aiMusicControl({
 *   instruction: "将第一首歌的前30秒作为开头，然后在40秒处插入第二首歌的副歌部分（从1分钟到1分30秒）",
 *   musicFiles: [
 *     { id: "song1", name: "开场曲.mp3", duration: 180, base64Data: "..." },
 *     { id: "song2", name: "主题曲.mp3", duration: 240, base64Data: "..." }
 *   ],
 *   totalDuration: 90
 * });
 * ```
 */
export async function aiMusicControl(request: AIMusicControlRequest): Promise<any> {
  console.log('\n========== 🎵 AI 音乐控制请求 ==========');
  console.log(`📌 用户指令: ${request.instruction}`);
  console.log(`📌 音乐文件数量: ${request.musicFiles.length}`);
  console.log(`📌 期望总时长: ${request.totalDuration || '自动'}秒`);
  console.log('==========================================\n');

  // 验证输入
  if (!request.instruction) {
    throw new Error('指令不能为空');
  }
  if (!request.musicFiles || request.musicFiles.length === 0) {
    throw new Error('音乐文件列表不能为空');
  }

  try {
    // 1. 构建消息
    const userMessage = buildUserMessage(request);

    console.log('\n========== 🤖 调用 AI 解析指令 ==========');

    // 2. 调用大模型解析指令
    const completion = await chatWithLogging(
      {
        model: AI_MODEL,
        messages: [
          { role: 'system', content: MUSIC_CONTROL_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ]
      },
      {
        module: 'AI音乐控制',
        userId: request.userId,
        userName: request.userName,
        metadata: {
          instruction: request.instruction,
          fileCount: request.musicFiles.length,
        },
      }
    );

    const aiResponse = completion.choices[0]?.message?.content || '';
    console.log(`📌 AI 响应: ${aiResponse}`);

    // 3. 解析 AI 响应
    const analysis = parseAIResponse(aiResponse);
    
    console.log('\n========== 📋 AI 解析结果 ==========');
    console.log(`📌 文件配置数量: ${analysis.files.length}`);
    console.log(`📌 建议总时长: ${analysis.totalDuration || '未指定'}秒`);
    console.log(`📌 解释: ${analysis.explanation}`);
    console.log('=====================================\n');

    // 4. 转化为音乐控制参数
    const controlRequest = await convertToControlRequest(
      analysis,
      request.musicFiles,
      request.totalDuration
    );

    // 5. 调用音乐控制函数
    console.log('\n========== 🎵 执行音乐控制 ==========');
    const result = await controlMusic(controlRequest);
    console.log('=====================================\n');

    return {result,userMessage,aiResponse};
  } catch (error) {
    console.error('\n========== ❌ AI 音乐控制错误 ==========');
    console.error(`📌 错误: ${error instanceof Error ? error.message : String(error)}`);
    console.error('============================================\n');
    throw error;
  }
}

/**
 * 简化的 AI 音乐控制接口
 * 只需要传入指令和文件数据数组
 * 
 * @param instruction 自然语言指令
 * @param files 文件数组，每个包含 id、name 和 base64 数据
 * @param totalDuration 可选的总时长
 * @returns 合并后的音乐文件 base64 字符串
 * 
 * @example
 * ```typescript
 * const result = await simpleAIMusicControl(
 *   "把这两首歌串起来，第一首取前30秒，第二首从10秒开始",
 *   [
 *     { id: "1", name: "歌1.mp3", base64Data: "..." },
 *     { id: "2", name: "歌2.mp3", base64Data: "..." }
 *   ]
 * );
 * ```
 */
export async function simpleAIMusicControl(
  instruction: string,
  files: Array<{ id: string; name: string; base64Data: string; duration?: number }>,
  totalDuration?: number
): Promise<string> {
  return aiMusicControl({
    instruction,
    musicFiles: files,
    totalDuration,
  });
}
