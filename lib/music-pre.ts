/**
 * Minimax 音乐母带预处理 API 封装
 */

export interface MusicCoverPreprocessRequest {
  model?: string;
  audio_url?: string;
  audioUrl?: string;
  audio_base64?: string;
  audioBase64?: string;
}

export interface MusicCoverPreprocessResponse {
  cover_feature_id: string;
  formatted_lyrics: string;
  structure_result: string;
  audio_duration: number;
  trace_id: string;
  base_resp: {
    status_code: number;
    status_msg: string;
  };
  // 驼峰命名的支持字段
  coverFeatureId?: string;
  formattedLyrics?: string;
  structureResult?: string;
  audioDuration?: number;
  traceId?: string;
  baseResp?: {
    statusCode: number;
    statusMsg: string;
  };
}

const MINIMAX_API_BASE = 'https://api.minimaxi.com/v1';
const MINIMAX_MUSIC_COVER_MODEL = 'music-cover';

/**
 * 音乐母带预处理
 * @param params 预处理参数
 * @returns 预处理响应
 */
export async function preprocessMusicCover(params: MusicCoverPreprocessRequest): Promise<MusicCoverPreprocessResponse> {
  const apiKey = process.env.MINIMAX_API_KEY;

  if (!apiKey) {
    throw new Error('MINIMAX_API_KEY is not configured');
  }

  // 优先使用 base64，其次使用 URL
  const audioBase64 = params.audio_base64 || params.audioBase64;
  const audioUrl = params.audio_url || params.audioUrl;

  if (!audioBase64 && !audioUrl) {
    throw new Error('audio_base64 or audio_url is required');
  }

  const requestUrl = `${MINIMAX_API_BASE}/music_cover_preprocess`;

  const requestBody: any = {
    model: params.model || MINIMAX_MUSIC_COVER_MODEL,
  };

  if (audioBase64) {
    requestBody.audio_base64 = audioBase64;
  } else {
    requestBody.audio_url = audioUrl;
  }

  console.log('\n========== 🎵 音乐母带预处理请求 ==========');
  console.log(`📌 API: ${requestUrl}`);
  console.log(`📌 模型: ${requestBody.model}`);
  console.log(`📌 使用方式: ${audioBase64 ? 'Base64' : 'URL'}`);
  console.log('=========================================\n');

  try {
    const startTime = Date.now();

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Minimax API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as MusicCoverPreprocessResponse;
    const duration = Date.now() - startTime;

    console.log('\n========== ✅ 音乐母带预处理响应 ==========');
    console.log(`📌 Trace ID: ${data.trace_id}`);
    console.log(`📌 状态码: ${data.base_resp.status_code}`);
    console.log(`📌 状态消息: ${data.base_resp.status_msg}`);
    console.log(`📌 封面特征ID: ${data.cover_feature_id}`);
    console.log(`📌 音频时长: ${data.audio_duration}s`);
    console.log(`📌 耗时: ${duration}ms`);
    console.log('=========================================\n');

    if (data.base_resp.status_code !== 0) {
      throw new Error(`Minimax music cover preprocess failed: ${data.base_resp.status_msg}`);
    }

    // 添加驼峰命名的支持
    const result = {
      ...data,
      coverFeatureId: data.cover_feature_id,
      formattedLyrics: data.formatted_lyrics,
      structureResult: data.structure_result,
      audioDuration: data.audio_duration,
      traceId: data.trace_id,
      baseResp: {
        statusCode: data.base_resp.status_code,
        statusMsg: data.base_resp.status_msg,
      }
    };

    return result;
  } catch (error) {
    console.error('\n========== ❌ 音乐母带预处理错误 ==========');
    console.error(`📌 错误: ${error instanceof Error ? error.message : String(error)}`);
    console.error('=========================================\n');
    throw error;
  }
}
