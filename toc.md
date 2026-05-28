# TOS (火山引擎对象存储) 应用逻辑与问题总结

## 1. TOS 库架构分析

### 1.1 核心依赖

```typescript
import { TosClient, TosClientError, TosServerError } from '@volcengine/tos-sdk';
```

**关键点**:
- 使用火山引擎官方 SDK `@volcengine/tos-sdk`
- 包含客户端和服务端两种错误类型

---

### 1.2 配置接口

```typescript
export interface TOSConfig {
  accessKeyId: string;
  accessKeySecret: string;
  region: string;
  endpoint: string;
}
```

**环境变量**:
- `TOS_ACCESS_KEY`: Access Key ID
- `TOS_SECRET_KEY`: Secret Access Key
- `TOS_REGION`: 区域（如 `cn-beijing`）
- `TOS_ENDPOINT`: 接入点域名

---

### 1.3 单例客户端模式

```typescript
let _tosClient: TosClient | null = null;

export function getTOSClient(): TosClient {
  if (!_tosClient) {
    const config = getTOSConfig();
    _tosClient = new TosClient({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      region: config.region,
      endpoint: config.endpoint,
    });
  }
  return _tosClient;
}
```

**设计优势**:
- 延迟初始化：首次使用时才创建
- 避免重复配置：全局共享一个实例
- 性能优化：减少连接创建开销

---

### 1.4 统一错误处理

```typescript
export class TOSOperationError extends Error {
  constructor(
    message: string,
    public readonly originalError?: TosClientError | TosServerError | Error
  ) {
    super(message);
    this.name = 'TOSOperationError';
  }
}

function handleTOSError(error: unknown): never {
  if (error instanceof TosClientError) {
    throw new TOSOperationError(
      `TOS 客户端错误: ${error.message}`,
      error
    );
  } else if (error instanceof TosServerError) {
    throw new TOSOperationError(
      `TOS 服务错误: ${error.code} - ${error.message}`,
      error
    );
  } else if (error instanceof Error) {
    throw new TOSOperationError(
      `未知错误: ${error.message}`,
      error
    );
  } else {
    throw new TOSOperationError(
      `未知错误类型: ${String(error)}`,
      error as Error
    );
  }
}
```

**错误分类**:
1. `TosClientError`: 客户端错误（参数、网络等）
2. `TosServerError`: 服务端错误（4xx/5xx）
3. 其他未知错误

---

## 2. 核心功能实现

### 2.1 文件上传

```typescript
export async function uploadFile(params: UploadFileParams): Promise<{ key: string; etag: string }> {
  try {
    const client = getTOSClient();
    
    // 转换 body 类型以匹配 TOS SDK 要求
    let body: Buffer | NodeJS.ReadableStream;
    if (typeof params.body === 'string') {
      body = Buffer.from(params.body);
    } else if (params.body instanceof Buffer) {
      body = params.body;
    } else if (params.body instanceof ReadableStream) {
      // 将 Web ReadableStream 转换为 Node.js ReadableStream
      const { Readable } = await import('stream');
      body = Readable.fromWeb(params.body as any);
    } else {
      body = params.body as Buffer | NodeJS.ReadableStream;
    }
    
    const result = await client.putObject({
      bucket: params.bucket,
      key: params.key,
      body,
      contentType: params.contentType,
      meta: params.metadata,
    });

    return {
      key: params.key,
      etag: result.headers['etag'] || '',
    };
  } catch (error) {
    handleTOSError(error);
  }
}
```

**类型适配**:
- `string` → `Buffer`
- Web `ReadableStream` → Node.js `ReadableStream`
- `Buffer` 直接使用

---

### 2.2 文件下载

```typescript
export async function downloadFile(params: DownloadFileParams): Promise<{ content: Buffer; metadata: Record<string, string> }> {
  try {
    const client = getTOSClient();
    
    // 使用 getObjectV2 并指定 dataType 为 'buffer' 以直接获取 Buffer
    const getObjectParams: any = {
      bucket: params.bucket,
      key: params.key,
      dataType: 'buffer',
    };
    
    // 如果指定了 range，添加到参数中
    if (params.range) {
      getObjectParams.range = params.range;
    }
    
    const result = await client.getObjectV2(getObjectParams);

    // 确保返回的是 Buffer 类型
    let content: Buffer;
    if (Buffer.isBuffer(result.data.content)) {
      content = result.data.content;
    } else {
      // 如果不是 Buffer，尝试转换
      content = Buffer.from(result.data.content as any);
    }

    return {
      content,
      metadata: result.headers as Record<string, string>,
    };
  } catch (error) {
    handleTOSError(error);
  }
}
```

**关键特性**:
- 使用 `getObjectV2` 新版本 API
- `dataType: 'buffer'` 直接获取 Buffer
- 支持断点续传（`range` 参数）

---

### 2.3 预签名 URL

```typescript
export interface PresignedUrlParams {
  bucket: string;
  key: string;
  /** 过期时间，单位秒，默认 3600 秒（1 小时） */
  expiresIn?: number;
  /** HTTP 方法，TOS SDK 仅支持 GET / PUT */
  method?: 'GET' | 'PUT';
}

export async function generatePresignedUrl(params: PresignedUrlParams): Promise<string> {
  try {
    const client = getTOSClient();
    
    const { bucket, key, expiresIn = 3600, method = 'GET' } = params;
    
    // 注意：TOS SDK 正确方法名为 getPreSignedUrl，参数名为 expires
    return client.getPreSignedUrl({
      bucket,
      key,
      expires: expiresIn,
      method,
    });
  } catch (error) {
    handleTOSError(error);
  }
}
```

**命名注意事项**:
- 方法名: `getPreSignedUrl` (注意大小写和拼写)
- 参数名: `expires` (不是 `expiresIn`)

---

## 3. 今日问题总结

### 3.1 问题背景

项目早期使用 TOS 存储音乐文件，但在与 Minimax API 集成时遇到严重问题：

```
Minimax API 错误: unknown error, download audio_url failed
```

**原因分析**:
- TOS 的 URL 可能存在访问限制（防盗链、私有桶等）
- Minimax 服务器无法正常下载 TOS 上的音频文件
- 网络策略或权限配置问题

---

### 3.2 用户需求变更

**用户明确要求**:
```
还是不行，改成不存toc，直接转成base64
```

**核心诉求**:
- ❌ 彻底删除 TOS 相关上传逻辑
- ✅ 前端直接将文件转成 Base64
- ✅ 后端接收 Base64 直接传给 Minimax API
- ✅ 避免文件在中间存储环节出问题

---

### 3.3 修改范围

#### 3.3.1 音乐母带上传 (`app/music-covers/new/page.tsx`)

**变更前**:
```typescript
// 1. 先上传到 TOS
const uploadRes = await fetch('/api/upload/audio', {
  method: 'POST',
  body: formData,
});

// 2. 再提交到 music-covers 接口
await fetch('/api/music-covers', {
  method: 'POST',
  body: JSON.stringify({ name, audioUrl }),
});
```

**变更后**:
```typescript
// 直接在前端转成 Base64
const arrayBuffer = await file.arrayBuffer();
const base64 = btoa(
  new Uint8Array(arrayBuffer)
    .reduce((data, byte) => data + String.fromCharCode(byte), '')
);
const base64data = `data:${file.type};base64,${base64}`;

// 直接提交 Base64 数据
await fetch('/api/music-covers', {
  method: 'POST',
  body: JSON.stringify({ name, base64data }),
});
```

---

#### 3.3.2 音乐母带接口 (`app/api/music-covers/route.ts`)

**变更前**:
```typescript
// 接收 audioUrl，存储到数据库
const { name, audioUrl } = await req.json();
```

**变更后**:
```typescript
// 接收 base64data，先调用 Minimax 预处理
const { name, base64data } = await req.json();

const preRes = await preprocessMusicCover({
  audio_base64: base64data,
});

// 存储到数据库
const musicCover = await prisma.musicCover.create({
  data: {
    name,
    base64data,
    coverFeatureId: preRes.cover_feature_id,
    formattedLyrics: preRes.formatted_lyrics,
    structureResult: preRes.structure_result,
    audioDuration: preRes.audio_duration,
  },
});
```

---

#### 3.3.3 音乐项目接口 (`app/api/music/route.ts`)

**新增逻辑**:
```typescript
// 获取第一个 musicCover 并获取 base64data 和 cover_feature_id
let musicCover = null;
if (musicCoverIds.length > 0) {
  musicCover = await prisma.musicCover.findUnique({
    where: { id: musicCoverIds[0] },
  });
  if (musicCover) {
    console.log(`📌 找到母带: ${musicCover.name}`);
    console.log(`📌 特征ID: ${musicCover.coverFeatureId}`);
    console.log(`📌 Base64长度: ${musicCover.base64data?.length || 0}`);
  }
}

// 调用 generateMusic
let musicGenerationResponse = null;
if (musicCover) {
  const generateParams = {
    prompt: prompt || undefined,
    output_format: 'url',
    aigc_watermark: false,
    is_instrumental: true,
    audio_base64: musicCover.base64data || undefined,
    cover_feature_id: musicCover.coverFeatureId || undefined,
    audio_setting: {
      sample_rate: sampleRate || 44100,
      bitrate: bitrate || 256000,
      format: format || 'mp3',
    },
  };

  console.log('\n========== 🎵 调用音乐生成 ==========');
  console.log(`📌 参数:`, generateParams);

  musicGenerationResponse = await generateMusic(generateParams);

  console.log('\n========== ✅ 音乐生成返回值 ==========');
  console.log(musicGenerationResponse);
  console.log('=====================================\n');
}
```

---

#### 3.3.4 音乐控制库 (`lib/music-control.ts`)

**变更前**:
```typescript
export interface MusicFileConfig {
  filePath: string;      // 文件路径
  // ...
}
```

**变更后**:
```typescript
export interface MusicFileConfig {
  fileData: string;      // Base64 字符串
  // ...
}

// 新增辅助函数
function saveBase64ToFile(base64: string, outputPath: string): string {
  // 处理可能的 data URI 前缀
  const base64Data = base64.replace(/^data:audio\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  writeFileSync(outputPath, buffer);
  return outputPath;
}

// 返回值也改为 Base64
export async function controlMusic(params: MusicControlRequest): Promise<string> {
  // ... 处理逻辑
  
  // 将最终文件转换为 base64
  const { readFileSync } = require('fs');
  const finalFileBuffer = readFileSync(finalOutputPath);
  const finalBase64 = finalFileBuffer.toString('base64');
  
  return finalBase64;
}
```

---

### 3.4 临时文件策略

虽然不再使用 TOS，但在 `music-control.ts` 中仍然使用临时文件：

```typescript
// 创建临时目录
const tempDir = join(process.cwd(), 'temp', 'music-control');
ensureTempDir(tempDir);

// 保存 base64 到临时文件
const tempFilePath = join(tempDir, `input-${uuidv4()}.mp3`);
saveBase64ToFile(config.fileData, tempFilePath);
```

**原因**:
- `fluent-ffmpeg` 需要文件路径作为输入
- 临时文件作为中间层，连接 Base64 和 FFmpeg
- 处理完成后可选择清理（当前保留用于调试）

---

## 4. 当前架构总结

### 4.1 数据流图

```
用户上传音频
    ↓
前端 → File → Base64
    ↓
后端 API 接收 Base64
    ↓
存储到数据库 (MusicCover.base64data)
    ↓
调用 Minimax 预处理 API
    ↓
存储返回结果 (coverFeatureId, lyrics, duration 等)
    ↓
创建音乐项目时
    ↓
从数据库读取 Base64 和特征ID
    ↓
调用 Minimax 音乐生成 API (audio_base64 + cover_feature_id)
    ↓
获取生成结果
```

---

### 4.2 数据库字段对应

```prisma
model MusicCover {
  id             String   @id @default(cuid())
  name           String
  base64data     String   // 音频 Base64（新增）
  
  // Minimax 预处理返回
  coverFeatureId String?  // 特征ID
  formattedLyrics String? // 格式化歌词
  structureResult String?  // 结构分析
  audioDuration  Float?   // 音频时长
  
  createdAt      DateTime @default(now())
}
```

---

## 5. 经验教训

### 5.1 关于外部存储

**问题**: 第三方 API（如 Minimax）可能无法访问你的私有存储服务

**解决方案**:
- 优先使用直接传递（Base64 / 字节流）
- 如需使用 URL，确保存储服务支持公网访问
- 考虑使用 CDN 或预签名 URL

---

### 5.2 关于 Base64

**优点**:
- 无需额外存储服务
- 数据自包含，减少网络请求
- 避免跨服务权限问题

**缺点**:
- 数据体积增加约 33%
- 数据库存储压力增大
- 传输时间更长

---

### 5.3 关于临时文件

**适用场景**:
- 需要调用命令行工具（如 FFmpeg）
- 需要多次处理同一文件
- 需要缓存中间结果

**注意事项**:
- 定期清理临时文件，避免磁盘溢出
- 使用 UUID 避免文件名冲突
- 考虑使用内存方案（如 RAM 盘）提升性能

---

## 6. 遗留问题与优化建议

### 6.1 临时文件清理

当前实现保留临时文件，建议添加：

```typescript
// 在处理完成后清理
import { rm } from 'fs/promises';

async function cleanupTempFiles(dir: string) {
  try {
    await rm(dir, { recursive: true, force: true });
    console.log(`✅ 临时文件已清理: ${dir}`);
  } catch (e) {
    console.warn(`⚠️ 清理临时文件失败: ${e}`);
  }
}
```

---

### 6.2 数据库性能

Base64 音频数据较大，考虑：

1. **压缩存储**: 对 Base64 数据使用 gzip 压缩
2. **分表存储**: 将音频数据分离到独立表
3. **分页查询**: 列表页不加载 Base64 字段

---

### 6.3 TOS 库的去留

当前项目已不使用 TOS，但 `lib/tos.ts` 仍保留。

**建议**:
- 如果确定不再使用，删除该文件
- 如需保留，更新文档说明当前不使用
- 考虑保留作为将来备选方案

---

## 总结

**今日核心变更**:
1. ✅ 完全移除 TOS 上传流程
2. ✅ 改为全链路 Base64 传输
3. ✅ 更新 `music-control.ts` 支持 Base64 输入输出
4. ✅ 在音乐项目创建时调用 Minimax 生成 API
5. ✅ 完善日志输出便于调试

**关键教训**:
- 外部服务间的网络连接可能不可靠
- 直接传递数据有时比中间存储更简单
- Base64 是兼容性最好的方案（尽管有额外开销）
