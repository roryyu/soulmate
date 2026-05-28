/**
 * 音乐文件控制库 - 截取和拼接
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

// 检查 fluent-ffmpeg 依赖
let ffmpeg: any;
try {
  ffmpeg = require('fluent-ffmpeg');
} catch (e) {
  console.warn('⚠️ fluent-ffmpeg 未安装，请运行: npm install fluent-ffmpeg ffmpeg-static');
}

// 配置 ffmpeg 路径 (如果使用 ffmpeg-static)
let ffmpegPath: string | undefined;
let ffprobePath: string | undefined;
try {
  const ffmpegStatic = require('ffmpeg-static');
  const ffprobeStatic = require('ffprobe-static');
  ffmpegPath = ffmpegStatic;
  ffprobePath = ffprobeStatic.path;
  if (ffmpeg) {
    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);
  }
} catch (e) {
  console.warn('⚠️ ffmpeg-static/ffprobe-static 未安装，请确保系统已安装 ffmpeg');
}

/**
 * 单个音乐文件配置
 */
export interface MusicFileConfig {
  fileData: string;       // 音乐文件的 base64 字符串
  startTime?: number;     // 截取开始时间（秒），默认为 0
  endTime?: number;       // 截取结束时间（秒），默认到文件结尾
  insertTime: number;     // 在最终音轨中的插入开始时间（秒）
}

/**
 * 将 base64 字符串保存到临时文件
 */
function saveBase64ToFile(base64: string, outputPath: string): string {
  // 处理可能的 data URI 前缀
  const base64Data = base64.replace(/^data:audio\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  writeFileSync(outputPath, buffer);
  return outputPath;
}

/**
 * 音乐拼接请求参数
 */
export interface MusicControlRequest {
  musicFiles: MusicFileConfig[];  // 音乐文件配置数组
  duration?: number;              // 总时长（秒），可选，默认根据插入时间计算
}

/**
 * 获取音频文件时长
 */
async function getAudioDuration(filePath: string): Promise<number> {
  if (!ffmpeg) {
    throw new Error('fluent-ffmpeg 未安装');
  }

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata.format.duration);
      }
    });
  });
}

/**
 * 截取单个音频文件
 */
async function trimAudio(
  inputPath: string,
  outputPath: string,
  startTime: number = 0,
  endTime?: number
): Promise<string> {
  if (!ffmpeg) {
    throw new Error('fluent-ffmpeg 未安装');
  }

  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath).output(outputPath);

    command.setStartTime(startTime);

    if (endTime !== undefined) {
      const duration = endTime - startTime;
      if (duration <= 0) {
        reject(new Error('截取时长必须大于 0'));
        return;
      }
      command.setDuration(duration);
    }

    command
      .on('end', () => resolve(outputPath))
      .on('error', (err: any) => reject(err))
      .run();
  });
}

/**
 * 使用 ffmpeg 创建带沉默的音频片段（用于占位）
 */
async function createSilence(duration: number, outputPath: string): Promise<string> {
  if (!ffmpeg) {
    throw new Error('fluent-ffmpeg 未安装');
  }

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input('anullsrc=r=44100:cl=stereo')
      .inputFormat('lavfi')
      .duration(duration)
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err: any) => reject(err))
      .run();
  });
}

/**
 * 拼接多个音频文件
 */
async function concatenateAudios(inputPaths: string[], outputPath: string): Promise<string> {
  if (!ffmpeg) {
    throw new Error('fluent-ffmpeg 未安装');
  }

  if (inputPaths.length === 0) {
    throw new Error('没有可拼接的音频文件');
  }

  if (inputPaths.length === 1) {
    // 只有一个文件，直接返回
    return inputPaths[0];
  }

  return new Promise((resolve, reject) => {
    const command = ffmpeg();

    // 添加所有输入文件
    inputPaths.forEach(path => {
      command.input(path);
    });

    command
      .on('end', () => resolve(outputPath))
      .on('error', (err: any) => reject(err))
      .mergeToFile(outputPath, dirname(outputPath));
  });
}

/**
 * 创建临时目录
 */
function ensureTempDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 音乐文件截取和拼接
 * @param params 请求参数
 * @returns 合并后的音乐文件的 base64 字符串
 */
export async function controlMusic(params: MusicControlRequest): Promise<string> {
  console.log('\n========== 🎵 音乐控制请求 ==========');
  console.log(`📌 音乐文件数量: ${params.musicFiles.length}`);
  console.log(`📌 总时长: ${params.duration ? `${params.duration}s` : '自动计算'}`);
  console.log('=====================================\n');

  if (!ffmpeg) {
    throw new Error('请先安装依赖: npm install fluent-ffmpeg ffmpeg-static ffprobe-static');
  }

  const { musicFiles, duration: requestDuration } = params;

  if (musicFiles.length === 0) {
    throw new Error('音乐文件列表不能为空');
  }

  try {
    const startTime = Date.now();

    // 创建临时目录
    const tempDir = join(process.cwd(), 'temp', 'music-control');
    ensureTempDir(tempDir);

    // 1. 预处理每个音乐文件：保存 base64 到临时文件、获取时长并验证
    const processedFiles: Array<{
      config: MusicFileConfig;
      tempFilePath: string;
      actualStartTime: number;
      actualEndTime: number;
      duration: number;
    }> = [];

    let maxEndTime = 0;

    for (const config of musicFiles) {
      if (!config.fileData) {
        throw new Error('fileData 不能为空');
      }

      // 保存 base64 到临时文件
      const tempFilePath = join(tempDir, `input-${uuidv4()}.mp3`);
      saveBase64ToFile(config.fileData, tempFilePath);

      // 获取文件时长
      const fileDuration = await getAudioDuration(tempFilePath);
      const actualStartTime = config.startTime ?? 0;
      const actualEndTime = config.endTime ?? fileDuration;

      if (actualStartTime < 0) {
        throw new Error(`开始时间不能为负数: ${actualStartTime}`);
      }

      if (actualEndTime > fileDuration) {
        console.warn(`⚠️ 结束时间超过文件时长，使用文件结尾: ${fileDuration}s`);
      }

      if (actualStartTime >= actualEndTime) {
        throw new Error(`开始时间必须小于结束时间: ${actualStartTime} >= ${actualEndTime}`);
      }

      const clipDuration = actualEndTime - actualStartTime;
      const fileEndTime = config.insertTime + clipDuration;

      if (fileEndTime > maxEndTime) {
        maxEndTime = fileEndTime;
      }

      processedFiles.push({
        config,
        tempFilePath,
        actualStartTime,
        actualEndTime: Math.min(actualEndTime, fileDuration),
        duration: clipDuration,
      });
    }

    // 计算最终时长
    const finalDuration = requestDuration ?? maxEndTime;

    console.log('\n========== 🎵 处理文件 ==========');
    processedFiles.forEach((file, index) => {
      console.log(`[${index + 1}] 临时文件: ${file.tempFilePath}`);
      console.log(`    截取: ${file.actualStartTime}s - ${file.actualEndTime}s (${file.duration}s)`);
      console.log(`    插入: ${file.config.insertTime}s`);
    });
    console.log(`最终时长: ${finalDuration}s`);
    console.log('==================================\n');

    // 2. 按插入时间排序
    const sortedFiles = [...processedFiles].sort((a, b) => a.config.insertTime - b.config.insertTime);

    // 3. 生成时间轴上的片段列表
    let currentTime = 0;
    const timelineSegments: Array<{
      type: 'silence' | 'audio';
      startTime: number;
      duration: number;
      filePath?: string;
      audioConfig?: typeof processedFiles[0];
    }> = [];

    for (const file of sortedFiles) {
      // 检查是否有间隙需要填充沉默
      if (file.config.insertTime > currentTime) {
        const silenceDuration = file.config.insertTime - currentTime;
        timelineSegments.push({
          type: 'silence',
          startTime: currentTime,
          duration: silenceDuration,
        });
        currentTime = file.config.insertTime;
      }

      // 添加音频片段
      timelineSegments.push({
        type: 'audio',
        startTime: file.config.insertTime,
        duration: file.duration,
        filePath: file.tempFilePath,
        audioConfig: file,
      });

      currentTime = file.config.insertTime + file.duration;
    }

    // 最后添加沉默到指定总时长
    if (currentTime < finalDuration) {
      timelineSegments.push({
        type: 'silence',
        startTime: currentTime,
        duration: finalDuration - currentTime,
      });
    }

    // 4. 处理所有片段（截取音频或生成沉默）
    const segmentFiles: string[] = [];

    for (let i = 0; i < timelineSegments.length; i++) {
      const segment = timelineSegments[i];
      const segmentId = uuidv4();
      const outputPath = join(tempDir, `segment-${i}-${segmentId}.mp3`);

      if (segment.type === 'silence') {
        await createSilence(segment.duration, outputPath);
      } else if (segment.audioConfig) {
        await trimAudio(
          segment.audioConfig.tempFilePath,
          outputPath,
          segment.audioConfig.actualStartTime,
          segment.audioConfig.actualEndTime
        );
      }

      segmentFiles.push(outputPath);
    }

    // 5. 拼接所有片段
    const finalOutputPath = join(tempDir, `merged-${uuidv4()}.mp3`);
    await concatenateAudios(segmentFiles, finalOutputPath);

    // 6. 将最终文件转换为 base64
    const { readFileSync } = require('fs');
    const finalFileBuffer = readFileSync(finalOutputPath);
    const finalBase64 = finalFileBuffer.toString('base64');

    const duration = Date.now() - startTime;

    console.log('\n========== ✅ 音乐控制完成 ==========');
    console.log(`📌 输出文件: ${finalOutputPath}`);
    console.log(`📌 最终时长: ${finalDuration}s`);
    console.log(`📌 Base64长度: ${finalBase64.length}`);
    console.log(`📌 耗时: ${duration}ms`);
    console.log('=====================================\n');

    return finalBase64;
  } catch (error) {
    console.error('\n========== ❌ 音乐控制错误 ==========');
    console.error(`📌 错误: ${error instanceof Error ? error.message : String(error)}`);
    console.error('=====================================\n');
    throw error;
  }
}

/**
 * 简化的接口 - 只传入文件 base64 数组和时间配置
 */
export async function mergeMusicFiles(
  musicFiles: Array<{
    data: string;
    trimStart?: number;
    trimEnd?: number;
    insertAt: number;
  }>,
  totalDuration?: number
): Promise<string> {
  return controlMusic({
    musicFiles: musicFiles.map(file => ({
      fileData: file.data,
      startTime: file.trimStart,
      endTime: file.trimEnd,
      insertTime: file.insertAt,
    })),
    duration: totalDuration,
  });
}
