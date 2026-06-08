# 🚀 全栈开发设计文档：Soulmates（数字疗愈全流程管理平台）

**项目名称**: Soulmates  
**核心定位**: 面向中小学教师的数字疗愈全流程管理平台，集 AI 选题、文献检索、文献速读、研究写作、论文润色、音乐生成与编辑、支付会员、多租户管理于一体。

---

## 1. 环境配置与技术栈 (Environment & Tech Stack)

| 层级 | 技术选型 |
|------|---------|
| **框架** | Next.js 14 (App Router) |
| **语言** | TypeScript |
| **样式** | Tailwind CSS + Airbnb 设计令牌 |
| **UI 组件** | 自研组件库（基于 Radix UI 原语） |
| **数据库** | PostgreSQL |
| **ORM** | Prisma |
| **认证** | NextAuth.js v5（邮箱密码 + 手机验证码双通道） |
| **AI** | OpenAI SDK → DeepSeek V3 / 火山引擎 Ark（可切换） |
| **音乐生成** | Minimax API（music-2.6 / music-cover） |
| **音频处理** | FFmpeg（fluent-ffmpeg） |
| **对象存储** | 火山引擎 TOS / 阿里云 OSS |
| **文档解析** | 火山引擎 Visual API（PDF/图片 OCR） |
| **短信服务** | 火山引擎 SMS |
| **支付** | 支付宝（RSA2 签名） |
| **文献检索** | CNKI API / Neki API |
| **向量检索** | 火山引擎 Embedding + PostgreSQL 向量存储 |

### 环境变量配置 (.env)

```env
# 数据库
DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"

# AI 提供商（deepseek / ark）
AI_PROVIDER="deepseek"
AI_API_KEY="sk-xxx"
AI_BASE_URL="https://api.deepseek.com/v1"
AI_MODEL="deepseek-chat"

# 火山引擎 Ark（当 AI_PROVIDER=ark）
ARK_API_KEY="xxx"
ARK_BASE_URL="https://ark.cn-beijing.volces.com/api/v3"
ARK_MODEL="doubao-pro-32k-2411"
ARK_TEXT_EMBEDDING_MODEL="doubao-embedding-text-250615"
ARK_EMBEDDING_MODEL="doubao-embedding-vision-250615"

# 火山引擎 TOS（对象存储）
TOS_ACCESS_KEY="xxx"
TOS_SECRET_KEY="xxx"
TOS_REGION="cn-beijing"
TOS_ENDPOINT="tos-cn-beijing.volces.com"
TOS_BUCKET="edu-nexus"

# 阿里云 OSS
OSS_ACCESS_KEY="xxx"
OSS_SECRET_KEY="xxx"
OSS_REGION="oss-cn-shanghai"
OSS_BUCKET=""

# 火山引擎 Visual（PDF/图片 OCR）
VISUAL_ACCESS_KEY_ID="xxx"
VISUAL_ACCESS_KEY_SECRET="xxx"
VISUAL_REGION="cn-north-1"

# 火山引擎 SMS
VOLCANO_SMS_ACCESS_KEY_ID="xxx"
VOLCANO_SMS_ACCESS_KEY_SECRET="xxx"
VOLCANO_SMS_ACCOUNT="xxx"
VOLCANO_SMS_SIGN="Soulmates"
VOLCANO_SMS_TEMPLATE_ID="xxx"

# 支付宝
ALIPAY_APP_ID=""
ALIPAY_PRIVATE_KEY=""
ALIPAY_PUBLIC_KEY=""
ALIPAY_GATEWAY="https://openapi-sandbox.dl.alipaydev.com/gateway.do"

# Minimax（音乐生成）
MINIMAX_API_KEY="xxx"
```

---

## 2. 设计系统 (Design System)

项目采用 **Airbnb 设计令牌**，全局 CSS 变量定义在 `app/globals.css`：

| 令牌 | 色值 | 用途 |
|------|------|------|
| `--primary` | `#ff385c` (Rausch) | 主色调、CTA 按钮 |
| `--foreground` | `#222222` (ink) | 主文字色 |
| `--muted-foreground` | `#6a6a6a` | 辅助文字 |
| `--border` | `#dddddd` | 边框 |
| `--surface-soft` | `#f7f7f7` | 柔灰背景 |
| `--hairline-soft` | `#ebebeb` | 细分割线 |
| `--radius` | `0.5rem` (8px) | 默认圆角 |

**核心 UI 组件** (`components/ui/`):
- `button.tsx` — 按钮（primary/outline/ghost/destructive）
- `input.tsx` / `textarea.tsx` / `select.tsx` — 表单控件
- `card.tsx` — 卡片容器
- `dialog.tsx` / `popover.tsx` / `command.tsx` — 浮层组件
- `badge.tsx` / `label.tsx` / `progress.tsx` / `switch.tsx` — 辅助组件
- `loading.tsx` — 加载状态
- `markdown-editor.tsx` — Markdown 编辑器

**布局组件** (`components/layout/`):
- `Navbar.tsx` — 全局导航栏（80px 白色，Airbnb 三层阴影，Rausch CTA）
- `Footer.tsx` — 全局页脚
- `AdminPageHeader.tsx` — 管理页面统一头部（返回 + 标题 + 操作按钮）

**首页特效** (`app/page.tsx`):
- Aurora 极光背景（多层径向渐变 + 漂移动画）
- 10 根 SVG 流动线条（贝塞尔曲线路径变形动画）
- 渐变流动标语文字（`background-clip: text` + 多色渐变动画）

---

## 3. 数据库设计 (Prisma Schema)

文件: `prisma/schema.prisma`

### 3.1 全局平台层

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  phone     String?  @unique
  password  String
  name      String?
  role      String   @default("TEACHER")  // TEACHER, ADMIN
  tenantId  String?
  // 关联: accounts, sessions, researchProjects, orders, memberships, credit, feedbacks...
}

model SmsCode {
  // 短信验证码（phone + code + type + expires）
}

model Account / Session / VerificationToken {
  // NextAuth 标准模型
}
```

### 3.2 多租户体系

```prisma
model TenantProduct {
  // 租户产品（name, userLimit, creditLimit）
}

model Tenant {
  // 租户（name, productId）
}

model Directory {
  // 目录树（name, parentId, tenantId）→ 支持嵌套
}

model Role {
  // 角色（name, permission）
}

model DirectoryUserRole {
  // 用户-目录-角色关联（@@unique([directoryId, userId])）
}
```

### 3.3 文档管理

```prisma
model Document {
  // 文档（fileName, fileType, content, fileData, status, directoryId）
}
```

### 3.4 Soulmates 核心模块

```prisma
model ResearchProject {
  // 课题项目（userId, title, field, description, status, prompt, sampleRate, bitrate, format, tocDataId）
  // 关联: ideas, searches, references, documents, writings, papers, outlines, musicCovers
}

model ResearchIdea        { /* 选题灵感（title, rationale, isAdopted） */ }
model ResearchSearch      { /* 检索式（userTopic, cnkiQuery） */ }
model ResearchReference   { /* 文献参考（fileName, summary, innovationPoints, methodology, keyPages） */ }
model ResearchDocument    { /* 文献速读文档（embeddingStatus, embeddingProgress） */ }
model DocumentChunk       { /* 文档分块 + 向量（content, embedding, chunkIndex） */ }
model DocumentAnalysis    { /* 文档分析结果（prompt, content） */ }
model DocumentChat        { /* 文档问答记录（question, answer） */ }
model ResearchWriting     { /* 研究写作（type: value/objective/content/innovation, content） */ }
model ResearchPaper       { /* 论文润色（title, content） */ }
model ResearchOutline     { /* 文献综述大纲（title, content, sourceDocs, status） */ }
```

### 3.5 音乐模块

```prisma
model MusicCover {
  // 音乐母带（name, coverFeatureId, structureResult, base64data, audioDuration, audioFilePath, status）
}

model MusicCoverResource {
  // 音乐母带-项目关联（researchProjectId, musicCoverId）
}
```

### 3.6 AI 对话记录

```prisma
model AIConversation {
  // AI 调用日志（userId, module, model, prompt, response, tokens, duration, error）
}
```

### 3.7 支付与会员

```prisma
model Product {
  // 产品/套餐（name, price, originalPrice, type: MEMBERSHIP/CREDIT_PACKAGE/SINGLE_PURCHASE, duration, credits）
}

model Order {
  // 订单（outTradeNo, tradeNo, totalAmount, status: PENDING/PAID/CANCELLED/REFUNDED）
}

model PaymentRecord {
  // 支付记录（tradeNo, tradeStatus, totalAmount, receiptAmount, buyerId...）
}

model UserMembership {
  // 会员记录（startAt, endAt, status: ACTIVE/EXPIRED/CANCELLED）
}

model UserCredit {
  // 积分钱包（userId @unique, balance）
}

model CreditTransaction {
  // 积分流水（amount, type: PURCHASE/CONSUME/REFUND/ADMIN_ADJUST, operationType, balanceAfter）
}

model AIOperationConfig {
  // AI 操作积分消耗配置（operationType @unique, creditCost, isActive）
}

model SystemSetting {
  // 系统配置键值存储（key @id, value）
}
```

### 3.8 问题反馈

```prisma
model FeedbackType   { /* 问题类型（name, sortOrder） */ }
model Feedback       { /* 反馈（title, description, status, priority, assignedTo） */ }
model FeedbackReply  { /* 回复（content, isAdmin） */ }
model FeedbackStatus { /* 状态变更历史 */ }
```

### 3.9 TOC 数据与处方

```prisma
model TocData {
  // TOS 文件数据（id, name, key, etag）
}

model Prescription {
  // 处方（id, key, name, prompt, arguments, etag）
}
```

---

## 4. API 路由架构

### 4.1 管理后台 API (`app/api/admin/`)

| 路由 | 功能 |
|------|------|
| `music/` | 音乐项目 CRUD + 列表分页 |
| `music/[id]/` | 音乐项目详情/删除 |
| `prescription/` | 处方 CRUD + 列表分页 |
| `prescription/[id]/` | 处方详情/编辑/删除 |
| `prescription/[id]/download/` | 处方音频下载 |
| `prescription/[id]/stream/` | 处方音频流播放 |
| `toc-data/` | 文件上传/列表 |
| `toc-data/[id]/` | 文件详情/删除 |
| `toc-data/[id]/download/` | 文件下载 |
| `toc-data/[id]/stream/` | 音频流播放 |
| `products/` | 产品 CRUD |
| `orders/` | 订单列表 |
| `feedback/` | 反馈管理 |
| `feedback-types/` | 反馈类型管理 |
| `ai-config/` | AI 操作积分配置 |
| `system-settings/` | 系统设置 |
| `users/[userId]/credits/` | 用户积分管理 |
| `users/[userId]/membership/` | 用户会员管理 |

### 4.2 用户端 API

| 路由 | 功能 |
|------|------|
| `auth/[...nextauth]/` | NextAuth 认证 |
| `auth/register/` | 邮箱注册 |
| `auth/phone-login/` | 手机验证码登录 |
| `auth/phone-register/` | 手机号注册 |
| `auth/send-sms-code/` | 发送短信验证码 |
| `auth/change-password/` | 修改密码 |
| `auth/admin/impersonate/` | 管理员模拟登录 |
| `user/profile/` | 用户资料 |
| `user/credits/` | 积分查询 |
| `user/membership/` | 会员状态 |
| `user/orders/` | 订单列表 |
| `ai/conversations/` | AI 对话记录 |
| `ai/tuning/` | AI 调优 |
| `payment/create/` | 创建支付 |
| `payment/notify/` | 支付宝异步通知 |
| `payment/query/` | 支付查询 |
| `payment/sync-confirm/` | 支付确认同步 |
| `music-covers/` | 音乐母带 CRUD |
| `feedback/` | 用户反馈提交 |
| `document/parse/` | 文档解析 |
| `directory/` | 目录 CRUD + 权限 |

### 4.3 多租户 API

| 路由 | 功能 |
|------|------|
| `tenant/add/` / `edit/` / `delete/` / `find/` | 租户管理 |
| `tenant-product/add/` / `edit/` / `delete/` / `find/` | 租户产品管理 |
| `role/add/` / `edit/` / `delete/` / `find/` | 角色管理 |
| `tenant-admin/users/` / `roles/` | 租户管理员接口 |

---

## 5. 核心库文件 (lib/)

### 5.1 AI 服务 (`lib/ai.ts`)

支持双 AI 提供商切换：
- **DeepSeek**（默认）：`AI_PROVIDER=deepseek`
- **火山引擎 Ark**：`AI_PROVIDER=ark`

```typescript
import { aiClient, AI_MODEL, getAIProvider, createEmbedding } from '@/lib/ai'
```

### 5.2 认证 (`lib/auth.ts`)

NextAuth v5 配置，双通道登录：
1. **邮箱 + 密码**：`CredentialsProvider(id: 'credentials')`
2. **手机号 + 验证码**：`CredentialsProvider(id: 'phone-verification-code')`

```typescript
import { authOptions } from '@/lib/auth'
```

### 5.3 音乐生成 (`lib/music.ts`)

Minimax API 封装，模型 `music-2.6`：

```typescript
import { generateMusic, MusicGenerationRequest } from '@/lib/music'

const result = await generateMusic({
  prompt: "轻快的钢琴曲",
  is_instrumental: true,
  audio_setting: { sample_rate: 44100, bitrate: 320, format: "mp3" }
})
```

### 5.4 音乐母带预处理 (`lib/music-pre.ts`)

Minimax `music-cover` 模型，提取封面特征、歌词、结构分析：

```typescript
import { preprocessMusicCover } from '@/lib/music-pre'

const result = await preprocessMusicCover({ audio_url: "https://..." })
// → { cover_feature_id, formatted_lyrics, structure_result, audio_duration }
```

### 5.5 音乐控制编辑 (`lib/music-control.ts`)

基于 FFmpeg 的音频截取、拼接、时间轴插入：

```typescript
import { controlMusic, mergeMusicFiles } from '@/lib/music-control'

const merged = await controlMusic({
  musicFiles: [
    { fileData: base64, startTime: 0, endTime: 15, insertTime: 0 },
    { fileData: base64, startTime: 5, endTime: 35, insertTime: 20 },
  ],
  duration: 90,
})
```

### 5.6 AI 音乐控制 (`lib/ai-music-client.ts`)

通过自然语言指令控制音乐编辑，AI 解析意图 → 生成编辑参数 → 调用 `music-control`：

```typescript
import { controlMusicByAI } from '@/lib/ai-music-client'

const result = await controlMusicByAI({
  instruction: "背景曲是素材1，素材2在1分30秒插入",
  musicFiles: [...],
})
```

### 5.7 对象存储

- **火山引擎 TOS** (`lib/tos.ts`)：主要文件存储
- **阿里云 OSS** (`lib/oss.ts`)：备用存储

### 5.8 文档解析 (`lib/volcano-visual.ts`)

火山引擎 Visual API，支持 PDF/图片 OCR 解析，返回 Markdown 格式文本。

### 5.9 短信服务 (`lib/sms/volcano-sms.ts`)

火山引擎 SMS，HMAC-SHA256 签名，6 位数字验证码，10 分钟有效期，60 秒发送间隔。

### 5.10 支付 (`lib/alipay.ts`)

支付宝电脑网站支付，RSA2 签名/验签，支持沙箱环境。

### 5.11 积分系统 (`lib/credits.ts`)

- 会员有效期内 AI 操作免费
- 非会员按 `AIOperationConfig` 配置扣减积分
- PDF OCR 按页数分档计费（每 100 页一档）
- 新用户赠送积分（`SystemSetting` 可配置）

### 5.12 RAG 问答 (`lib/rag.ts`)

- 文档分块（500 字符 + 50 字符重叠）
- 向量化存储（火山 Embedding）
- 相似度检索 + AI 问答

### 5.13 文献检索

- **CNKI** (`lib/cnki.ts`)：中国知网 API，支持搜索 + GB/T 7714 引用格式化
- **Neki** (`lib/neki.ts`)：备用文献检索服务

### 5.14 AI 提示词库 (`lib/prompts/index.ts`)

统一管理所有 AI 功能的提示词：

| 模块 | 功能 |
|------|------|
| `IDEATION_PROMPTS` | 选题灵感生成（5 个选题 + 说明） |
| `SEARCH_PROMPTS` | CNKI 检索式生成/变宽松/变严格 |
| `READING_PROMPTS` | 文献分析（内容/框架/观点/方法/精读）+ 文档问答 |
| `WRITING_PROMPTS` | 研究写作（概念界定/价值/目标/内容/方法/过程/关键问题/创新点） |
| `POLISHING_PROMPTS` | 论文润色 |
| `OUTLINE_PROMPTS` | 文献综述大纲生成 |

---

## 6. 前端页面架构

### 6.1 路由结构

```
app/
├── page.tsx                          # 首页（Aurora 极光 + 功能入口）
├── layout.tsx                        # 根布局（Inter 字体 + Providers）
├── globals.css                       # Airbnb 设计令牌 + 动画
├── providers.tsx                     # SessionProvider
│
├── auth/                             # 认证
│   ├── signin/page.tsx               # 登录页
│   ├── register/page.tsx             # 注册页
│   └── admin/                        # 超级管理员
│       ├── dashboard/page.tsx        # 管理仪表盘
│       ├── users/page.tsx            # 用户管理
│       ├── roles/page.tsx            # 角色管理
│       ├── tenant/page.tsx           # 租户管理
│       └── tenant-product/page.tsx   # 租户产品管理
│
├── admin/                            # 管理后台
│   ├── music/                        # 音乐生成管理
│   │   ├── page.tsx                  # 列表（卡片网格 + 搜索 + 分页）
│   │   ├── new/page.tsx              # 新建（表单：基本信息 + 音频设置）
│   │   └── [id]/page.tsx             # 详情（状态 + 音频播放/下载）
│   ├── prescription/                 # 处方管理
│   │   ├── page.tsx                  # 列表
│   │   ├── new/page.tsx              # 新建（关联音频 + 提示词 + 时长）
│   │   └── [id]/page.tsx             # 详情（编辑模式 + 播放/下载）
│   ├── toc-data/                     # 文件管理
│   │   ├── page.tsx                  # 列表（拖拽上传 + 播放/下载）
│   │   ├── new/page.tsx              # 上传页
│   │   └── [id]/edit/page.tsx        # 详情（Key/ETag/时间）
│   ├── products/                     # 产品管理
│   ├── orders/                       # 订单管理
│   ├── feedback/                     # 反馈管理
│   ├── feedback-types/               # 反馈类型
│   ├── ai-config/                    # AI 积分配置
│   └── system-settings/              # 系统设置
│
├── dashboard/                        # 用户端
│   ├── conversations/                # AI 对话记录
│   ├── membership/                   # 会员中心
│   ├── orders/                       # 我的订单
│   ├── settings/                     # 个人设置
│   └── feedback/                     # 问题反馈
│
├── music-covers/                     # 音乐母带
│   ├── page.tsx                      # 列表
│   ├── new/page.tsx                  # 上传预处理
│   └── [id]/                         # 详情/编辑
│
└── payment/                          # 支付
    ├── page.tsx                      # 支付页
    └── return/page.tsx               # 支付回调
```

### 6.2 管理页面设计规范

所有管理页面遵循统一的 Airbnb 风格：

- **背景**: `bg-white`
- **头部**: `AdminPageHeader` 组件（80px 白色导航，三层阴影）
- **内容区**: `max-w-[1280px]`（列表）/ `max-w-2xl`（表单），`px-6 lg:px-10 py-10`
- **卡片**: `rounded-[14px] border border-[#dddddd]` + 彩色渐变背景
  - music: `from-white via-rose-50/30 to-orange-50/40`
  - prescription: `from-white via-purple-50/30 to-pink-50/40`
  - toc-data: `from-white via-cyan-50/30 to-sky-50/40`
- **按钮**: `h-12 rounded-lg bg-[#ff385c]` (Rausch) / `border-[#dddddd]` (outline)
- **输入框**: `h-12 border-[#dddddd] rounded-lg`
- **空状态**: `border border-[#ebebeb] rounded-[14px]` + 图标 + 引导文案
- **加载**: `border-2 border-[#dddddd] border-t-[#222222]` 旋转动画

---

## 7. 开发实施步骤

### 第一步：环境搭建
1. `npm install` 安装依赖
2. 配置 `.env.local`（参考 `.env.example`）
3. `npx prisma db push` 初始化数据库
4. `npm run dev` 启动开发服务器

### 第二步：基础设施
1. 认证系统（NextAuth + 邮箱/手机双通道）
2. 多租户体系（Tenant → Directory → User Role）
3. AI 服务（DeepSeek/Ark 双提供商）
4. 对象存储（TOS/OSS）
5. 支付系统（支付宝）

### 第三步：Soulmates 核心功能
1. 选题灵感（AI 生成 5 个研究选题）
2. 文献检索（CNKI 检索式生成 + 变宽松/变严格）
3. 文献速读（PDF 上传 → OCR 解析 → 向量化 → RAG 问答）
4. 研究写作（概念界定/价值/目标/内容/方法/创新点）
5. 论文润色
6. 文献综述大纲生成

### 第四步：音乐模块
1. 音乐母带上传与预处理（Minimax music-cover）
2. 音乐生成（Minimax music-2.6）
3. AI 音乐控制编辑（自然语言 → 截取/拼接参数）
4. 处方管理（音频编辑模板）

### 第五步：商业化
1. 产品/套餐管理
2. 支付宝支付集成
3. 会员系统（有效期 + 权益）
4. 积分系统（消耗/购买/赠送）
5. AI 操作积分配置

### 第六步：运营支撑
1. 问题反馈系统
2. AI 对话日志
3. 系统设置（键值配置）
4. 管理后台完整功能

---

## 8. 关键技术决策

| 决策 | 选择 | 原因 |
|------|------|------|
| AI 提供商 | DeepSeek + 火山 Ark 双支持 | 灵活切换，降低成本 |
| 向量存储 | PostgreSQL（Float[]） | 无需额外向量数据库 |
| 音频处理 | FFmpeg + fluent-ffmpeg | 成熟稳定，功能全面 |
| 对象存储 | 火山 TOS 为主，阿里 OSS 备用 | 与火山生态集成 |
| 支付 | 支付宝电脑网站支付 | RSA2 签名，沙箱可测 |
| 设计系统 | Airbnb 设计令牌 | 简洁现代，品牌感强 |
| 认证 | NextAuth v5 Credentials | 双通道（邮箱+手机） |
| 多租户 | 自建 Tenant 模型 | 灵活可控 |
