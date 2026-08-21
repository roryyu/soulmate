import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json({ error: '没有音频文件' }, { status: 400 });
    }

    // 读取音频文件并转为 base64
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Audio = buffer.toString('base64');
    
    // 确定音频类型
    const mimeType = audioFile.type || 'audio/webm';
    const dataUri = `data:${mimeType};base64,${base64Audio}`;

    // 初始化 OpenAI 客户端（兼容阿里云百炼）
    const client = new OpenAI({
      apiKey: process.env.ASR_API_KEY,
      baseURL: process.env.ASR_BASE_URL,
    });

    // 调用 qwen3-asr-flash 进行语音识别（阿里云百炼扩展接口，类型用 any绕过）
    const completion = await client.chat.completions.create({
      model: process.env.ASR_MODEL || 'qwen3-asr-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'input_audio',
              input_audio: {
                data: dataUri
              }
            }
          ] as any
        }
      ],
      stream: false,
      asr_options: {
        enable_itn: false
      }
    } as any);

    const text = JSON.stringify(completion.choices[0]?.message || '');
    
    return NextResponse.json({
      text: text,
    });
  } catch (error: any) {
    console.error('语音识别错误:', error);
    return NextResponse.json(
      { error: error.message || '语音识别失败' },
      { status: 500 }
    );
  }
}
