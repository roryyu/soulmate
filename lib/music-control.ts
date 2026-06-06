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
  repeatInterval?: number; // 循环间隔（秒），设置后会每隔指定秒数重复插入，直到曲目结束
  isBackground?: boolean;  // 是否为背景曲（贯穿整个音乐，音量较低）
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
 * 截取单个音频文件（支持音量控制）
 */
async function trimAudio(
  inputPath: string,
  outputPath: string,
  startTime: number = 0,
  endTime?: number,
  volume: number = 1.0
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

    // 如果音量不是1，添加音量滤镜
    if (volume !== 1.0) {
      command.audioFilters(`volume=${volume}`);
    }

    command
      .on('end', () => resolve(outputPath))
      .on('error', (err: any) => reject(err))
      .run();
  });
}

/**
 * 混音：将背景曲与其他片段混合
 * 背景曲作为底层，其他片段叠加在上面
 */
async function mixAudioWithBackground(
  segmentFiles: string[],
  outputPath: string,
  tempDir: string
): Promise<string> {
  if (!ffmpeg) {
    throw new Error('fluent-ffmpeg 未安装');
  }

  if (segmentFiles.length < 2) {
    // 如果只有一个文件，直接复制
    return segmentFiles[0];
  }

  return new Promise((resolve, reject) => {
    // 第一个文件是背景曲，其余是叠加的片段
    const backgroundFile = segmentFiles[0];
    const overlayFiles = segmentFiles.slice(1);

    // 先将所有非背景文件拼接在一起
    const tempOverlayPath = join(tempDir, `overlay-${uuidv4()}.mp3`);
    
    if (overlayFiles.length === 0) {
      // 只有背景曲，直接返回
      return resolve(backgroundFile);
    }

    // 拼接叠加片段
    const concatCommand = ffmpeg();
    overlayFiles.forEach(file => {
      concatCommand.input(file);
    });
    
    concatCommand
      .on('end', () => {
        // 混音：背景曲 + 叠加片段
        const mixCommand = ffmpeg()
          .input(backgroundFile)
          .input(tempOverlayPath)
          .complexFilter([
            '[0:a]volume=0.3[bg]',  // 背景曲音量降低
            '[1:a]volume=1.0[fg]',  // 叠加片段保持原音量
            '[bg][fg]amix=inputs=2:duration=longest[out]'  // 混音
          ])
          .outputOptions(['-map', '[out]'])
          .output(outputPath);

        mixCommand
          .on('end', () => resolve(outputPath))
          .on('error', (err: any) => reject(err))
          .run();
      })
      .on('error', (err: any) => reject(err))
      .mergeToFile(tempOverlayPath, tempDir);
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
      clipDuration: number; // 原始截取时长（用于循环计算）
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
      
      // 计算最大结束时间（考虑循环）
      let fileEndTime = config.insertTime + clipDuration;
      if (config.repeatInterval && config.repeatInterval > 0) {
        // 对于循环文件，预计会持续到请求的总时长
        fileEndTime = requestDuration || (config.insertTime + clipDuration * 3); // 默认循环3次
      }

      if (fileEndTime > maxEndTime) {
        maxEndTime = fileEndTime;
      }

      processedFiles.push({
        config,
        tempFilePath,
        actualStartTime,
        actualEndTime: Math.min(actualEndTime, fileDuration),
        duration: clipDuration,
        clipDuration: clipDuration,
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

    // 2. 分离背景曲和普通素材
    const backgroundFiles = processedFiles.filter(f => f.config.isBackground);
    const normalFiles = processedFiles.filter(f => !f.config.isBackground);

    // 3. 生成时间轴上的片段列表
    let currentTime = 0;
    const timelineSegments: Array<{
      type: 'silence' | 'audio';
      startTime: number;
      duration: number;
      filePath?: string;
      audioConfig?: typeof processedFiles[0];
      volume?: number; // 音量系数（背景曲较低）
    }> = [];

    // 处理背景曲（贯穿整个音乐）
    for (const bgFile of backgroundFiles) {
      timelineSegments.push({
        type: 'audio',
        startTime: 0,
        duration: finalDuration,
        filePath: bgFile.tempFilePath,
        audioConfig: bgFile,
        volume: 0.3, // 背景曲音量较低
      });
    }

    // 按插入时间排序普通素材
    const sortedNormalFiles = [...normalFiles].sort((a, b) => a.config.insertTime - b.config.insertTime);

    // 处理普通素材（包括循环插入）
    for (const file of sortedNormalFiles) {
      const repeatInterval = file.config.repeatInterval;
      
      if (repeatInterval && repeatInterval > 0) {
        // 循环插入模式：从 insertTime 开始，每隔 repeatInterval 秒插入一次
        let currentInsertTime = file.config.insertTime;
        while (currentInsertTime + file.clipDuration <= finalDuration) {
          // 检查是否有间隙需要填充沉默
          if (currentInsertTime > currentTime) {
            const silenceDuration = currentInsertTime - currentTime;
            timelineSegments.push({
              type: 'silence',
              startTime: currentTime,
              duration: silenceDuration,
            });
          }
          
          timelineSegments.push({
            type: 'audio',
            startTime: currentInsertTime,
            duration: file.clipDuration,
            filePath: file.tempFilePath,
            audioConfig: file,
            volume: 1.0,
          });
          
          currentInsertTime += repeatInterval;
        }
        currentTime = Math.max(currentTime, currentInsertTime - repeatInterval + file.clipDuration);
      } else {
        // 单次插入模式
        // 检查是否有间隙需要填充沉默
        if (file.config.insertTime > currentTime) {
          const silenceDuration = file.config.insertTime - currentTime;
          timelineSegments.push({
            type: 'silence',
            startTime: currentTime,
            duration: silenceDuration,
          });
        }

        timelineSegments.push({
          type: 'audio',
          startTime: file.config.insertTime,
          duration: file.duration,
          filePath: file.tempFilePath,
          audioConfig: file,
          volume: 1.0,
        });

        currentTime = file.config.insertTime + file.duration;
      }
    }

    // 最后添加沉默到指定总时长
    if (currentTime < finalDuration) {
      timelineSegments.push({
        type: 'silence',
        startTime: currentTime,
        duration: finalDuration - currentTime,
      });
    }

    // 4. 处理所有片段（截取音频或生成沉默，支持音量控制）
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
          segment.audioConfig.actualEndTime,
          segment.volume
        );
      }

      segmentFiles.push(outputPath);
    }

    // 5. 混音并拼接所有片段
    const finalOutputPath = join(tempDir, `merged-${uuidv4()}.mp3`);
    
    // 检查是否有背景曲需要混音
    const hasBackground = timelineSegments.some(s => s.type === 'audio' && s.volume && s.volume < 1);
    
    if (hasBackground) {
      // 使用 ffmpeg 混音：背景曲 + 其他片段
      await mixAudioWithBackground(segmentFiles, finalOutputPath, tempDir);
    } else {
      // 普通拼接
      await concatenateAudios(segmentFiles, finalOutputPath);
    }

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
