/**
 * Minimax 音乐生成 API 封装
 */

export interface AudioSetting {
  sample_rate?: number;
  bitrate?: number;
  format?: string;
}

export interface MusicGenerationRequest {
  model?: string;
  prompt?: string;
  lyrics?: string;
  output_format?: string;
  aigc_watermark?: boolean;
  is_instrumental?: boolean;
  audio_url?: string;
  cover_feature_id?: string;
  audio_base64?: string;
  audio_setting?: AudioSetting;
}

export interface MusicGenerationResponse {
  data: {
    audio: string;
    status: number;
  };
  trace_id: string;
  extra_info: {
    music_duration: number;
    music_sample_rate: number;
    music_channel: number;
    bitrate: number;
    music_size: number;
  };
  analysis_info: unknown;
  base_resp: {
    status_code: number;
    status_msg: string;
  };
}

const MINIMAX_API_BASE = 'https://api.minimaxi.com/v1';
const MINIMAX_MUSIC_MODEL = 'music-2.6';

/**
 * 生成音乐
 * @param params 音乐生成参数
 * @returns 音乐生成响应
 */
export async function generateMusic(params: MusicGenerationRequest): Promise<MusicGenerationResponse> {
  const apiKey = process.env.MINIMAX_API_KEY;

  if (!apiKey) {
    throw new Error('MINIMAX_API_KEY is not configured');
  }

  const requestUrl = `${MINIMAX_API_BASE}/music_generation`;

  const requestBody = {
    model: params.model || MINIMAX_MUSIC_MODEL,
    prompt: params.prompt,
    output_format: params.output_format || 'url',
    seed:Math.round(Math.random() * 100),
    aigc_watermark: params.aigc_watermark ?? false,
    is_instrumental: params.is_instrumental ?? true,
    //cover_feature_id: params.cover_feature_id,
    audio_setting: params.audio_setting,
  };

  console.log('\n========== 🎵 音乐生成请求 ==========');
  console.log(`📌 API: ${requestUrl}`);
  console.log(`📌 模型: ${requestBody.model}`);
  console.log(`📌 提示词: ${params.prompt || '无'}`);
  console.log(`📌 是否器乐: ${requestBody.is_instrumental}`);
  console.log('=====================================\n');

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

    const data = await response.json() as MusicGenerationResponse;
    const duration = Date.now() - startTime;

    console.log('\n========== ✅ 音乐生成响应 ==========');
    console.log(`📌 Trace ID: ${data.trace_id}`);
    console.log(`📌 状态码: ${data.base_resp.status_code}`);
    console.log(`📌 状态消息: ${data.base_resp.status_msg}`);
    console.log(`📌 音乐时长: ${data.extra_info?.music_duration}ms`);
    console.log(`📌 耗时: ${duration}ms`);
    console.log('=====================================\n');

    if (data.base_resp.status_code !== 0) {
      throw new Error(`Minimax music generation failed: ${data.base_resp.status_msg}`);
    }

    return data;
  } catch (error) {
    console.error('\n========== ❌ 音乐生成错误 ==========');
    console.error(`📌 错误: ${error instanceof Error ? error.message : String(error)}`);
    console.error('=====================================\n');
    throw error;
  }
}
