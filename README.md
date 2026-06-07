# EduNexus (Soulmates)

现代化全栈Next.js应用，用于教育数字疗愈项目管理。帮助教师和学生通过创意构思、文献搜索、阅读参考文献、撰写文稿等阶段管理数字疗愈项目。

## 🚀 技术栈

- **框架**: Next.js 14 with App Router
- **语言**: TypeScript
- **样式**: Tailwind CSS + shadcn/ui
- **动画**: Framer Motion
- **认证**: Auth.js (NextAuth.js)
- **数据库**: PostgreSQL with Prisma ORM
- **AI**: OpenAI 兼容 API (支持 DeepSeek)
- **代码质量**: ESLint + Prettier

## 📋 先决条件

- Node.js 18+ 
- PostgreSQL 数据库
- npm 或 yarn

## 🛠️ 安装

1. **克隆和设置**：
   ```bash
   npx create-nextjs-app my-app
   cd my-app
   ```

2. **环境设置**：
   ```bash
   cp .env.example .env.local
   ```
   
   根据提示配置 `.env.local` 中的环境变量（参考上面的环境变量部分）

3. **安装依赖**：
   ```bash
   npm install
   ```

4. **数据库设置**：
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

## 🔧 Prisma 开发规则

1. **严禁使用** `prisma db push`（为了保留完整的 SQL 迁移历史）。
2. **本地修改数据库**：每次改完 schema 后，必须让我使用 `npx prisma migrate dev --name <简短的修改说明>`。
3. **生产环境部署**：只能提供 `npx prisma migrate deploy` 命令。

5. **启动开发**：
   ```bash
   npm run dev
   ```

## 📁 项目结构

```
├── app/                          # Next.js 14 App Router
│   ├── api/                      # API 路由
│   │   ├── auth/                 # 认证 API
│   │   │   ├── [...nextauth]/    # NextAuth 处理
│   │   │   └── register/         # 注册接口
│   │   ├── health/               # 健康检查
│   │   ├── protected/            # 受保护接口示例
│   │   └── research/              # 研究项目 API
│   │       └── projects/[projectId]/
│   │           ├── documents/    # 文档分析/聊天
│   │           ├── drafts/       # 文稿 CRUD
│   │           ├── ideas/        # 创意 CRUD
│   │           ├── references/   # 参考资料
│   │           └── searches/     # 搜索记录
│   ├── auth/                      # 认证页面
│   │   ├── register/             # 注册页
│   │   └── signin/               # 登录页
│   ├── dashboard/                # 用户仪表板
│   ├── research/                 # 研究项目工作流页面
│   │   └── [projectId]/
│   │       ├── ideation/         # 创意构思
│   │       ├── search/           # 文献搜索
│   │       ├── reading/          # 文献阅读
│   │       ├── writing/          # 文稿撰写
│   │       └── layout.tsx        # 项目布局
│   ├── globals.css               # 全局样式
│   ├── layout.tsx                # 根布局
│   ├── page.tsx                  # 首页
│   └── providers.tsx             # React Provider
├── components/                    # 可复用组件
│   └── ui/                       # shadcn/ui 组件
├── lib/                          # 工具函数
│   ├── prompts/                  # AI 提示词
│   │   └── research-prompts.ts   # 研究流程提示词
│   ├── ai.ts                     # AI 客户端配置
│   ├── prisma.ts                 # Prisma 单例
│   └── utils.ts                  # 工具函数
├── prisma/                       # 数据库
│   ├── migrations/              # 迁移文件
│   └── schema.prisma            # 数据库模型
└── types/                        # TypeScript 类型定义
    └── next-auth.d.ts           # NextAuth 类型扩展
```

## 🔐 认证

应用包含完整的认证系统：

- 邮箱/密码登录
- 受保护路由
- 会话管理
- 用户数据库存储

## 🗄️ 数据库

使用 PostgreSQL 与 Prisma ORM 进行类型安全的数据库操作，包含以下主要模型：

### 认证相关
- **User** - 用户账户信息（邮箱、密码、角色）
- **Account** - 第三方登录账户关联
- **Session** - 用户会话管理
- **VerificationToken** - 邮箱验证令牌

### Soulmates核心模型
- **ResearchProject** - 数字疗愈课题项目
- **ResearchIdea** - 项目创意/构思
- **ResearchSearch** - CNKI 文献搜索记录
- **ResearchReference** - 文献参考资料

## 🎨 UI组件

使用shadcn/ui和Tailwind CSS构建：

- 美观、可访问的组件
- 深色模式支持
- 响应式设计
- Framer Motion流畅动画

## ⚙️ 环境变量

创建 `.env.local` 文件（参考 `.env.example`）：

```
# 数据库连接 (PostgreSQL)
DATABASE_URL="postgresql://用户名:密码@localhost:5432/数据库名"

# NextAuth 配置
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="您的密钥"

# AI 提供商配置 (支持 deepseek 或 ark)
AI_PROVIDER="deepseek"

# DeepSeek 配置 (AI_PROVIDER=deepseek 时使用)
AI_API_KEY="您的API密钥"
AI_BASE_URL="https://api.deepseek.com/v1"
AI_MODEL="deepseek-chat"

# 火山引擎 ARK 配置 (AI_PROVIDER=ark 时使用)
ARK_API_KEY="您的火山引擎API密钥"
ARK_BASE_URL="https://ark.cn-beijing.volces.com/api/v3"
ARK_MODEL="doubao-pro-32k-2411"
```

### AI 提供商切换

系统支持在 **DeepSeek** 和 **火山引擎（ARK）** 之间切换：

1. **切换到火山引擎**：
   在 `.env.local` 中设置：
   ```
   AI_PROVIDER=ark
   ARK_API_KEY="您的火山引擎API密钥"
   ARK_MODEL="您的火山引擎模型ID"
   ```

2. **切换回 DeepSeek**：
   在 `.env.local` 中设置：
   ```
   AI_PROVIDER=deepseek
   AI_API_KEY="您的DeepSeek API密钥"
   ```

修改后重启开发服务器即可生效。

## 📚 可用脚本

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器
- `npm run lint` - 运行ESLint
- `npm run db:push` - 推送模式到数据库
- `npm run db:studio` - 打开Prisma Studio
- `npm run db:generate` - 生成Prisma客户端

## 📝 项目功能

Soulmates (EduNexus) 提供完整的教育数字疗愈项目管理流程：

1. **创意构思** - 使用 AI 生成课题创意和研究方向
2. **文献搜索** - 集成 CNKI 文献搜索功能
3. **文献阅读** - 管理参考文献和重要观点
4. **文稿撰写** - 分章节撰写课题报告（价值、目标、框架、创新、拓展）

## 🚀 部署

准备部署到 Vercel、Railway 或自托管服务器。

## 🔄 健康检查

访问 `/api/health` 验证 API 状态。