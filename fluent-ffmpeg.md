# Fluent-FFmpeg 音频合成分析文档

## 1. 库的引入与初始化

```typescript
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
```

**关键点**:
- 使用 `require` 动态引入库（避免 TypeScript 编译问题）
- 可选使用 `ffmpeg-static` 提供静态二进制文件
- 通过 `setFfmpegPath` 和 `setFfprobePath` 配置可执行文件路径

---

## 2. 获取音频时长

```typescript
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
```

**关键业务逻辑**:
- 使用 `ffmpeg.ffprobe()` 分析音频文件元数据
- `metadata.format.duration` 获取总时长（秒）
- 封装为 Promise 支持 async/await

---

## 3. 音频截取

```typescript
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
```

**关键实现**:
1. **链式调用**: `ffmpeg(input).output(output)` 创建命令
2. **开始时间**: `setStartTime(seconds)` 指定截取起点
3. **时长控制**: `setDuration(seconds)` 指定截取长度
4. **事件监听**:
   - `on('end')`: 处理完成回调
   - `on('error')`: 错误处理回调
5. **执行**: `.run()` 启动处理

---

## 4. 创建沉默音频

```typescript
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
```

**关键业务逻辑**:
- 使用 `lavfi` (Libavfilter) 虚拟输入设备
- `anullsrc=r=44100:cl=stereo` 生成 44.1kHz 立体声沉默
- `inputFormat('lavfi')` 指定输入格式
- `duration()` 设置总时长

---

## 5. 拼接多个音频

```typescript
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
```

**关键实现**:
1. **多输入**: 通过循环调用 `.input(path)` 添加多个音频文件
2. **合并功能**: `.mergeToFile(output, tempDir)` 自动处理拼接
   - 内部使用 `concat` 滤镜
   - 需要临时目录存放中间文件
3. **边界处理**: 单个文件直接返回，避免不必要处理

---

## 6. 主流程：完整的音乐控制

### 6.1 预处理阶段

```typescript
// 1. 预处理每个音乐文件：保存 base64 到临时文件、获取时长并验证
const processedFiles: Array<{
  config: MusicFileConfig;
  tempFilePath: string;
  actualStartTime: number;
  actualEndTime: number;
  duration: number;
}> = [];

for (const config of musicFiles) {
  // 保存 base64 到临时文件
  const tempFilePath = join(tempDir, `input-${uuidv4()}.mp3`);
  saveBase64ToFile(config.fileData, tempFilePath);

  // 获取文件时长
  const fileDuration = await getAudioDuration(tempFilePath);
  // ... 验证逻辑
}
```

**业务逻辑**:
- 将 Base64 数据持久化为临时文件
- 获取每个文件的真实时长用于计算
- 验证时间参数的有效性

---

### 6.2 时间轴规划

```typescript
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
```

**关键业务逻辑**:
1. **排序**: 按插入时间对音频文件排序
2. **间隙检测**: 比较 `insertTime` 与 `currentTime` 发现沉默间隙
3. **时间轴构建**: 混合音频片段和沉默片段
4. **时间推进**: 更新 `currentTime` 跟踪进度

---

### 6.3 片段处理

```typescript
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
```

**实现策略**:
- 遍历时间轴，逐个处理片段
- 为每个片段生成唯一文件名
- 根据类型调用不同的处理函数
- 收集所有生成的片段文件路径

---

### 6.4 最终拼接与输出

```typescript
// 5. 拼接所有片段
const finalOutputPath = join(tempDir, `merged-${uuidv4()}.mp3`);
await concatenateAudios(segmentFiles, finalOutputPath);

// 6. 将最终文件转换为 base64
const { readFileSync } = require('fs');
const finalFileBuffer = readFileSync(finalOutputPath);
const finalBase64 = finalFileBuffer.toString('base64');

return finalBase64;
```

**流程**:
1. 调用 `concatenateAudios` 合并所有片段
2. 读取最终文件为 Buffer
3. 转换为 Base64 字符串返回

---

## 7. 关键设计模式

### 7.1 Promise 封装

所有 FFmpeg 操作都封装为 Promise:

```typescript
return new Promise((resolve, reject) => {
  ffmpeg()
    .input(...)
    .output(...)
    .on('end', () => resolve(result))
    .on('error', (err) => reject(err))
    .run();
});
```

**优点**:
- 支持 `async/await` 语法
- 更好的错误处理
- 便于并行/串行控制

---

### 7.2 临时文件管理

```typescript
// 创建临时目录
const tempDir = join(process.cwd(), 'temp', 'music-control');
ensureTempDir(tempDir);

// 使用 UUID 生成唯一文件名
const tempFilePath = join(tempDir, `input-${uuidv4()}.mp3`);
```

**策略**:
- 统一的临时目录结构
- UUID 避免文件名冲突
- 所有中间文件都在同一目录

---

### 7.3 分阶段处理

```
输入验证 → 时间轴规划 → 片段生成 → 最终拼接 → Base64输出
```

**优势**:
- 每步职责单一
- 便于调试和日志记录
- 中间结果可复用

---

## 8. 错误处理与边界情况

### 8.1 参数验证

```typescript
if (!config.fileData) {
  throw new Error('fileData 不能为空');
}

if (actualStartTime < 0) {
  throw new Error(`开始时间不能为负数: ${actualStartTime}`);
}

if (actualStartTime >= actualEndTime) {
  throw new Error(`开始时间必须小于结束时间: ${actualStartTime} >= ${actualEndTime}`);
}
```

### 8.2 异常捕获

```typescript
try {
  // 处理逻辑
} catch (error) {
  console.error('\n========== ❌ 音乐控制错误 ==========');
  console.error(`📌 错误: ${error instanceof Error ? error.message : String(error)}`);
  console.error('=====================================\n');
  throw error;
}
```

---

## 9. 日志记录

```typescript
console.log('\n========== 🎵 音乐控制请求 ==========');
console.log(`📌 音乐文件数量: ${params.musicFiles.length}`);
console.log(`📌 总时长: ${params.duration ? `${params.duration}s` : '自动计算'}`);
console.log('=====================================\n');

// ... 中间日志 ...

console.log('\n========== ✅ 音乐控制完成 ==========');
console.log(`📌 输出文件: ${finalOutputPath}`);
console.log(`📌 最终时长: ${finalDuration}s`);
console.log(`📌 Base64长度: ${finalBase64.length}`);
console.log(`📌 耗时: ${duration}ms`);
console.log('=====================================\n');
```

**日志特点**:
- 分阶段标记（请求/处理/完成/错误）
- 关键指标记录（数量、时长、耗时）
- 清晰的分隔线便于阅读

---

## 10. 性能考虑

### 10.1 文件 I/O
- 使用临时文件而非内存处理大音频
- 避免重复读取同一文件

### 10.2 并行处理
当前实现是串行处理片段，可优化为:
```typescript
// 潜在优化：并行处理独立片段
await Promise.all(
  timelineSegments.map(async (segment, i) => {
    // 处理逻辑
  })
);
```

### 10.3 临时文件清理
当前实现保留临时文件，可添加:
```typescript
// 处理完成后清理临时文件
// import { rm } from 'fs/promises';
// await rm(tempDir, { recursive: true, force: true });
```

---

## 11. 依赖安装

```bash
# 核心库
npm install fluent-ffmpeg

# 静态二进制文件（可选，但推荐）
npm install ffmpeg-static ffprobe-static

# 其他辅助库
npm install uuid
npm install --save-dev @types/uuid
```

---

## 总结

**Fluent-FFmpeg 的核心价值**:
1. **链式 API**: 直观的命令构建方式
2. **事件驱动**: 通过 `on('end')` / `on('error')` 处理异步
3. **抽象底层**: 隐藏复杂的 FFmpeg 命令行参数
4. **强大功能**: 支持截取、拼接、滤镜等高级操作

**本项目的实现特点**:
- ✅ 完全使用 Base64 输入输出
- ✅ 智能时间轴规划与沉默填充
- ✅ 完善的错误处理和日志
- ✅ 清晰的代码结构与职责分离
