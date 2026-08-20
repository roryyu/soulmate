import { NextRequest, NextResponse } from 'next/server';
import sherpa_onnx from 'sherpa-onnx-node';
import path from 'path';
import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { unlinkSync } from 'fs';

const modelDir = path.join(process.cwd(), 'sherpa-onnx-sense-voice-zh-en-ja-ko-yue-2024-07-17');

export async function POST(request: NextRequest) {
  let tempFile: string | null = null;
  
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json({ error: '没有音频文件' }, { status: 400 });
    }

    // 将音频文件保存到临时目录
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    tempFile = path.join(tmpdir(), `voice-${Date.now()}.wav`);
    await writeFile(tempFile, buffer);

    // 初始化识别器
    const recognizer = new sherpa_onnx.OfflineRecognizer({
      modelConfig: {
        senseVoice: {
          model: path.join(modelDir, 'model.int8.onnx'),
        },
        tokens: path.join(modelDir, 'tokens.txt'),
        numThreads: 4,
        debug: false,
      },
    });

    // 读取音频文件
    const wave = sherpa_onnx.readWave(tempFile);
    
    // 创建流并识别
    const stream = recognizer.createStream();
    stream.acceptWaveform({ samples: wave.samples, sampleRate: wave.sampleRate });
    recognizer.decode(stream);
    
    const result = recognizer.getResult(stream);
    
    // 清理临时文件
    if (tempFile) {
      try {
        unlinkSync(tempFile);
      } catch (e) {
        // 忽略删除错误
      }
    }

    return NextResponse.json({
      text: result.text,
      lang: result.lang,
      emotion: result.emotion,
      event: result.event,
    });
  } catch (error) {
    // 清理临时文件
    if (tempFile) {
      try {
        unlinkSync(tempFile);
      } catch (e) {
        // 忽略删除错误
      }
    }
    
    console.error('语音识别错误:', error);
    return NextResponse.json({ error: '语音识别失败' }, { status: 500 });
  }
}
