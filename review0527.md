# Soulmate 项目代码 Review (2026-05-27)

## 一、整体概述

本次开发主要集中在：
1. **音乐生成功能** - 集成 Minimax API 进行音乐生成
2. **音乐母带管理** - 支持上传、预处理和管理音乐母带
3. **音乐控制库** - 使用 fluent-ffmpeg 进行音频处理
4. **UI 页面更新** - 新建/编辑音乐项目页面

---

## 二、关键问题与建议

### 🔴 严重问题

#### 1. `lib/music.ts` - 参数传递不完整

**问题描述**：
```typescript
// 第 62-71 行
const requestBody = {
  model: params.model || MINIMAX_MUSIC_MODEL,
  prompt: params.prompt,
  output_format: params.output_format || 'url',
  seed: Math.round(Math.random() * 100),
  aigc_watermark: params.aigc_watermark ?? false,
  is_instrumental: params.is_instrumental ?? true,
  // cover_feature_id: params.cover_feature_id,  // ❌ 被注释掉了
  audio_setting: params.audio_setting,
  // ❌ audio_base64 也没有被传递
};
```

**问题分析**：
- `cover_feature_id` 被注释掉，无法使用音乐母带的特征
- `audio_base64` 参数完全缺失
- 虽然 API 路由正确传递了这些参数，但音乐生成函数没有使用

**建议修复**：
```typescript
const requestBody = {
  model: params.model || MINIMAX_MUSIC_MODEL,
  prompt: params.prompt,
  output_format: params.output_format || 'url',
  seed: Math.round(Math.random() * 100),
  aigc_watermark: params.aigc_watermark ?? false,
  is_instrumental: params.is_instrumental ?? true,
  cover_feature_id: params.cover_feature_id, // ✅ 取消注释
  audio_base64: params.audio_base64, // ✅ 添加
  audio_setting: params.audio_setting,
};
```

---

#### 2. `app/api/music/route.ts` - 没有保存生成结果

**问题描述**：
```typescript
// 第 82-120 行调用了 generateMusic 并 console.log
// 但第 123-147 行创建 ResearchProject 时
// ❌ 完全没有使用 musicGenerationResponse 的结果
// 例如生成的音频 URL 等信息都没有保存

const project = await prisma.researchProject.create({
  data: {
    userId,
    title,
    field,
    description: description || null,
    status: status || 'DRAFT',
    prompt: prompt || null,
    sampleRate: sampleRate || 44100,
    bitrate: bitrate || 256000,
    format: format || 'mp3',
    musicCovers: {
      create: musicCoverIds.map((id: string) => ({
        musicCoverId: id,
      })),
    },
    // ❌ 没有保存生成的音频数据
  },
  // ...
});
```

**问题分析**：
- 音乐生成结果只是打印到控制台，没有持久化
- 用户创建项目后看不到生成的音乐
- `ResearchProject` 模型中没有字段存储生成结果

**建议修复**：
1. 在 `schema.prisma` 中为 `ResearchProject` 添加字段
2. 保存 API 返回的音频 URL 和其他信息

---

#### 3. `lib/music-control.ts` - 临时文件清理

**问题描述**：
```typescript
// 第 202 行创建临时目录
const tempDir = join(process.cwd(), 'temp', 'music-control');
// ❌ 没有清理逻辑，临时文件会无限累积
```

**问题分析**：
- 每次调用都会生成临时文件但不清理
- 长时间运行会占用大量磁盘空间
- 存在安全隐患（临时文件可能包含敏感数据）

**建议修复**：
```typescript
import { rm } from 'fs/promises';

// 在控制函数结束时清理
async function cleanupTempFiles(dir: string): Promise<void> {
  try {
    await rm(dir, { recursive: true, force: true });
    console.log('✅ 临时文件已清理');
  } catch (e) {
    console.warn('⚠️ 清理临时文件失败:', e);
  }
}

// 在 controlMusic 函数的 finally 块中调用
```

---

#### 4. `app/api/music-covers/route.ts` - 参数名称不匹配

**问题描述**：
```typescript
// 第 66-77 行，接收参数是 audioBase64
const {
  name,
  fileName,
  fileType,
  fileSize,
  shouldPreprocess = false,
  audioBase64, // ❌ 驼峰命名
} = data;

// 第 88-89 行，调用 preprocessMusicCover 时也用 audioBase64
preprocessResult = await preprocessMusicCover({
  audioBase64: audioBase64,
});
```

**但实际前端传递的是** `base64data`，与 MusicCover 模型字段一致。

**建议修复**：统一参数名称为 `base64data` 或 `audio_base64`。

---

### 🟡 中等问题

#### 5. 类型安全问题

**`app/music/new/page.tsx` 第 27 行**：
```typescript
type MusicCover = {
  id: string;
  name: string | null;
  audioDuration: number | null;
  status: string;
  createdAt: Date;
};
```
但 `schema.prisma` 中 `MusicCover` 还有 `base64data`、`coverFeatureId` 等字段，类型定义不完整。

**建议**：直接使用 Prisma 生成的类型：
```typescript
import type { MusicCover as PrismaMusicCover } from '@prisma/client';

type MusicCover = Pick<PrismaMusicCover, 'id' | 'name' | 'audioDuration' | 'status' | 'createdAt'>;
```

---

#### 6. 错误处理不够细致

**`app/api/music/route.ts` 第 95-120 行**：
```typescript
try {
  // 调用 generateMusic
} catch (error) {
  // ❌ 只是打印错误，然后继续创建项目
  // 用户不知道生成失败了
}
```

**建议**：
- 如果音乐生成失败，应该告知用户
- 或者提供重试机制
- 至少在返回的响应中包含状态信息

---

#### 7. `lib/music.ts` - 参数缺少验证

**问题描述**：
```typescript
// 没有验证必填参数
if (params.audio_base64 && params.cover_feature_id) {
  // ❌ 可能同时存在，导致 API 报错
}
```

**建议**：
```typescript
if (params.audio_base64 && params.cover_feature_id) {
  console.warn('⚠️ audio_base64 和 cover_feature_id 同时提供，优先使用 cover_feature_id');
}
```

---

### 🟢 轻微问题与建议

#### 8. 日志输出格式

当前日志使用 emoji 前缀，风格一致，很好！但建议：
- 考虑使用环境变量控制日志级别
- 生产环境可关闭详细日志

#### 9. API 路由缺少认证检查

虽然项目整体使用 NextAuth，但音乐相关的 API 路由没有显式检查用户登录状态。

---

## 三、数据库设计 Review

### 现有结构

```prisma
model ResearchProject {
  // ...
  prompt      String?  @db.Text // 音乐生成提示词
  sampleRate  Int      @default(44100)
  bitrate     Int      @default(256000)
  format      String   @default("mp3")
  musicCovers MusicCoverResource[]
}

model MusicCover {
  id              String   @id @default(cuid())
  name            String?
  coverFeatureId  String?
  structureResult String?  @db.Text
  base64data      String?  @db.Text // 存储整个 base64 可能太大
  audioDuration   Int?
  // ...
}
```

### 问题与建议

#### 1. `base64data` 字段过大
- 直接在数据库中存 base64 音频数据会导致数据库膨胀
- 建议使用文件存储，数据库只存路径
- 如果必须用 base64，考虑压缩存储

#### 2. `ResearchProject` 缺少生成结果字段
建议添加：
```prisma
model ResearchProject {
  // ... 现有字段
  
  generatedAudioUrl  String?  // 生成的音频 URL
  generatedAudioData String?  @db.Text // 如果需要存 base64
  generationStatus   String   @default("PENDING") // PENDING, PROCESSING, COMPLETED, FAILED
  generationError    String?  @db.Text
  generationDuration Int?     // 生成耗时（毫秒）
  
  musicCovers MusicCoverResource[]
}
```

---

## 四、架构建议

### 1. 使用队列处理音乐生成

音乐生成是耗时操作，建议：
- 使用 BullMQ 等队列库
- 用户创建项目后立即返回，后台处理生成
- 通过 WebSocket 或轮询通知用户完成状态

### 2. 音频文件存储策略

虽然目前使用 base64，但建议考虑：
- Minimax 返回 URL 后，直接存储 URL
- 或将 URL 下载到自己的对象存储后保存新 URL
- 避免在数据库存大文本

### 3. API 响应结构统一

建议所有音乐相关 API 统一响应格式：
```typescript
{
  success: boolean;
  data: any;
  error?: string;
  metadata?: any;
}
```

---

## 五、文件列表与功能对应

| 文件路径 | 功能 | 状态 |
|---------|------|------|
| `lib/music.ts` | Minimax 音乐生成 | ⚠️ 需修复参数传递 |
| `lib/music-pre.ts` | 音乐母带预处理 | ✅ 良好 |
| `lib/music-control.ts` | 音频处理（截取/拼接） | ⚠️ 需添加清理逻辑 |
| `app/api/music/route.ts` | 音乐项目 CRUD | ⚠️ 需保存生成结果 |
| `app/api/music-covers/route.ts` | 音乐母带管理 | ⚠️ 参数命名问题 |
| `app/music/new/page.tsx` | 新建音乐项目页面 | ✅ 良好 |
| `app/music/[id]/edit/page.tsx` | 编辑音乐项目页面 | 需要确认 |
| `prisma/schema.prisma` | 数据库设计 | ⚠️ 需补充字段 |

---

## 六、建议的修复优先级

1. **高优先级**：
   - 修复 `lib/music.ts` 参数传递问题
   - 更新数据库模型，保存音乐生成结果
   - 修改 `app/api/music/route.ts` 保存生成数据

2. **中优先级**：
   - 添加临时文件清理逻辑
   - 统一参数命名
   - 改进错误处理

3. **低优先级**：
   - 优化日志系统
   - 添加单元测试
   - 完善 TypeScript 类型

---

## 七、总结

本次开发功能实现了音乐生成的核心流程，包括：
- ✅ Minimax API 集成
- ✅ 音乐母带管理
- ✅ 音频处理能力
- ✅ 美观的 UI 页面

但在数据持久化、错误处理、资源清理等方面还有改进空间。建议优先解决高优先级问题，然后逐步完善中低优先级项。
