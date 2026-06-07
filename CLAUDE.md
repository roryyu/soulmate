# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EduNexus (Soulmates) is a Next.js 14 full-stack application for educational research project management. It helps teachers and students manage research projects through multiple stages: ideation, literature search, document analysis, writing, and paper polishing.

**Core Features**:
- **Research Workflow**: Ideation → Search (CNKI) → Reading/Analysis → Writing → Paper Polishing
- **Document Intelligence**: PDF/DOCX parsing, OCR, vector embeddings, RAG-based Q&A
- **Payment System**: Alipay integration with credit-based operations and membership tiers
- **SMS Authentication**: Volcano Engine SMS service for phone verification

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Animation**: Framer Motion
- **Auth**: Auth.js (NextAuth.js) with email/password and SMS support
- **Database**: PostgreSQL with Prisma ORM
- **AI**: Multi-provider support (DeepSeek, Volcano ARK)
- **Storage**: Volcano TOS (object storage)
- **OCR**: Volcano Visual API for PDF/image parsing
- **Payment**: Alipay SDK

## Common Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build (runs prisma generate first)
npm run start            # Start production server
npm run lint             # Run ESLint

# Database (IMPORTANT: See Prisma Rules below)
npm run db:generate      # Generate Prisma client after schema changes
npm run db:migrate       # Create and apply new migration (use this instead of db:push)
npm run db:migrate:deploy # Apply migrations in production
npm run db:studio        # Open Prisma Studio GUI
npm run db:seed          # Seed database with initial data

# Utilities
npm run create-user      # Create new user via CLI
tsx scripts/seed-products.ts  # Seed product data
```

## CRITICAL: Prisma Database Rules

⚠️ **NEVER use `prisma db push` in this project** - it bypasses migrations and loses SQL history.

**Correct workflow for schema changes**:
1. Edit `prisma/schema.prisma`
2. Run `npm run db:migrate` (generates migration file with descriptive name)
3. Commit both schema and migration files
4. In production: use `npm run db:migrate:deploy` only

## Environment Variables

Create `.env.local` from `.env.example`. Key variables:

**Database**:
- `DATABASE_URL` - PostgreSQL connection string
- `PRISMA_CONNECTION_LIMIT` - Connection pool limit (optional, for serverless)

**Auth**:
- `NEXTAUTH_URL` - Auth callback URL (e.g., http://localhost:3000)
- `NEXTAUTH_SECRET` - Secret key for session encryption

**AI Provider** (supports DeepSeek or Volcano ARK):
- `AI_PROVIDER` - "deepseek" (default) or "ark"
- For DeepSeek: `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`
- For ARK: `ARK_API_KEY`, `ARK_BASE_URL`, `ARK_MODEL`, `ARK_TEXT_EMBEDDING_MODEL`, `ARK_EMBEDDING_MODEL`

**Volcano Services**:
- TOS (Storage): `TOS_ACCESS_KEY`, `TOS_SECRET_KEY`, `TOS_REGION`, `TOS_ENDPOINT`, `TOS_BUCKET`
- Visual (OCR): `VISUAL_ACCESS_KEY_ID`, `VISUAL_ACCESS_KEY_SECRET`, `VISUAL_REGION`
- SMS: `VOLCANO_SMS_ACCESS_KEY_ID`, `VOLCANO_SMS_ACCESS_KEY_SECRET`, `VOLCANO_SMS_ACCOUNT`, `VOLCANO_SMS_SIGN`, `VOLCANO_SMS_TEMPLATE_ID`

**Payment**:
- `ALIPAY_APP_ID`, `ALIPAY_PRIVATE_KEY`, `ALIPAY_PUBLIC_KEY`, `ALIPAY_GATEWAY`

## Architecture

### Permission System (Three-tier)

| Role | Route prefix | Scope |
|------|-------------|-------|
| Super Admin (ADMIN) | `/auth/admin/*` | Global user/tenant/role management |
| Tenant Admin | `/auth/tenant-admin/*` | Tenant-level user management & directory permissions |
| Teacher (TEACHER) | `/research/*`, `/dashboard/*` | Research projects & personal settings |

### Pages (40+)

**Public**: `/` (landing), `/payment`, `/payment/return`

**Auth**: `/auth/signin` (email + SMS login), `/auth/register` (email + phone register)

**Super Admin (`/auth/admin`)**: `dashboard`, `users`, `roles`, `tenant`, `tenant-product`

**Tenant Admin (`/auth/tenant-admin`)**: `dashboard`, `users`, `directory`

**Business Admin (`/admin`)**: `products` (+ new/edit), `orders`, `ai-config`, `feedback`, `feedback-types`, `system-settings`

**User Dashboard (`/dashboard`)**: `conversations` (+ tuning), `feedback`, `membership`, `orders`, `settings`

**Research (`/research/[projectId]`)**: `ideation` → `search` → `reading` → `outlines` → `writing` → `polishing`

### API Routes (95 endpoints)

**Auth (`/api/auth`)**: `[...nextauth]`, `register`, `phone-register`, `phone-login`, `send-sms-code`, `change-password`, `admin/impersonate`, `admin/users`

**User (`/api/user`)**: `profile`, `membership`, `credits`, `orders`

**Tenant (`/api/tenant`)**: `find`, `add`, `edit/[id]`, `delete/[id]` | `/api/tenants` (list)

**Tenant Product (`/api/tenant-product`)**: `find`, `add`, `edit/[id]`, `delete/[id]`

**Role (`/api/role`)**: `find`, `add`, `edit/[id]`, `delete/[id]`

**Directory (`/api/directory`)**: `find`, `find-by-user`, `find-by-user-with-read`, `add`, `edit/[id]`, `delete/[id]`, `find-documents`, `get-documents`, `upload`, `documents/[docId]/preview`, `find-user-roles`, `add-user-role`, `delete-user-role`

**Document (`/api/document`)**: `parse`

**Research (`/api/research/projects/[projectId]`)**:
- Ideas: `ideas` (list), `ideas/generate` (AI), `ideas/[ideaId]`
- Searches: `searches` (list), `searches/generate` (AI), `searches/adjust`, `searches/[searchId]`
- References: `references` (list/add), `references/analyze` (AI), `references/[referenceId]`
- Documents: `documents` (list/upload), `documents/import`, `documents/[docId]`, `documents/[docId]/analyze` (AI), `documents/[docId]/analysis/[analysisId]`, `documents/[docId]/chat` (RAG), `documents/[docId]/preview`, `documents/[docId]/progress`
- Writings: `writings` (CRUD)
- Papers: `papers` (CRUD)
- Outlines: `outlines` (list), `outlines/generate` (AI), `outlines/[outlineId]`

**AI (`/api/ai`)**: `conversations` (list), `conversations/[id]`, `conversations/users`, `tuning`

**AI Config**: `/api/ai-config` (frontend read), `/api/admin/ai-config` (CRUD), `/api/admin/ai-config/[operationType]`

**Payment (`/api/payment`)**: `create`, `notify` (Alipay async callback), `query`, `sync-confirm`

**Admin (`/api/admin`)**: `products` (CRUD), `orders`, `feedback`, `feedback-types`, `system-settings`, `users/[userId]/credits`, `users/[userId]/membership`

**Tenant Admin (`/api/tenant-admin`)**: `users`, `roles`

**Feedback (`/api/feedback`)**: submit/query | `/api/feedback-types`: list

**TOS Storage (`/api/tos`)**: `upload`, `download`, `delete`, `list`, `presigned`

### Database Schema (Prisma) — 25 Models

**Tenant Module**:
- `TenantProduct` — id, name, userLimit, creditLimit
- `Tenant` — id, name, productId → TenantProduct; has many User, Directory

**Directory & Permissions**:
- `Directory` — id, name, parentId (self-ref tree), tenantId → Tenant; has many Document, DirectoryUserRole
- `Role` — id, name, permission; has many DirectoryUserRole
- `DirectoryUserRole` — directoryId, userId, roleId; unique(directoryId, userId)

**Document Module**:
- `Document` — id, fileName, fileType(pdf/docx/txt), content, fileData(TOS path), status(pending/processed/failed), directoryId

**Auth Module**:
- `User` — id, email(unique), phone(unique), password, name, role(TEACHER/ADMIN), tenantId; has 1-to-1 UserCredit
- `SmsCode` — phone, code, type(LOGIN/REGISTER/BIND), used, expires
- `Account`, `Session`, `VerificationToken` — NextAuth standard tables

**Research Module**:
- `ResearchProject` — userId, title, field, description, status(DRAFT/COMPLETED)
- `ResearchIdea` — projectId, title, rationale, isAdopted
- `ResearchSearch` — projectId, userTopic, cnkiQuery
- `ResearchReference` — projectId, fileName, summary, innovationPoints, methodology
- `ResearchDocument` — projectId, documentId, embeddingStatus(pending/processing/completed/failed), embeddingProgress(0-100)
- `DocumentChunk` — documentId, chunkIndex, content, embedding(Float[]), tokenCount
- `DocumentAnalysis` — documentId, prompt, content
- `DocumentChat` — documentId, question, answer (RAG Q&A)
- `ResearchWriting` — projectId, type(value/objective/content/innovation), content; unique(projectId, type)
- `ResearchPaper` — projectId(unique), title, content
- `ResearchOutline` — projectId, title, content(Markdown), sourceDocs(JSON), status(draft/published)

**AI Logging**:
- `AIConversation` — userId, userName, module, model, prompt, response, tokens, duration(ms), error, metadata(JSON); indexed on userId, module, createdAt

**Payment & Membership**:
- `Product` — name, description, price, originalPrice, type(MEMBERSHIP/CREDIT_PACKAGE/SINGLE_PURCHASE), duration(days), credits, isActive, sortOrder
- `Order` — userId, productId, outTradeNo(unique), tradeNo, subject, totalAmount, status(PENDING/PAID/CANCELLED/REFUNDED), payMethod(ALIPAY), paidAt, expiredAt
- `PaymentRecord` — orderId, outTradeNo, tradeNo, tradeStatus, totalAmount, buyerId, rawNotifyData
- `UserMembership` — userId, productId, orderId, startAt, endAt, status(ACTIVE/EXPIRED/CANCELLED)
- `UserCredit` — userId(unique), balance
- `CreditTransaction` — userId, amount(+/-), type(PURCHASE/CONSUME/REFUND/ADMIN_ADJUST), orderId, operationType, balanceAfter
- `AIOperationConfig` — operationType(unique), creditCost(default 10), isActive
- `SystemSetting` — key(PK), value

**Feedback Module**:
- `FeedbackType` — name, description, sortOrder
- `Feedback` — userId, userName, typeId, title, description, status(PENDING/PROCESSING/COMPLETED/CLOSED), priority(LOW/NORMAL/HIGH), assignedTo, attachments(JSON)
- `FeedbackReply` — feedbackId, userId, content, isAdmin
- `FeedbackStatus` — feedbackId, oldStatus, newStatus, changedBy

### Key Patterns

**API Design**:
- All API routes use `app/api/*/route.ts` (Next.js 14 Route Handlers)
- Authentication via `getServerSession(authOptions)` from `lib/auth.ts`
- Credit deduction via `checkAndConsumeCredits()` from `lib/credits.ts`

**AI Integration**:
- Multi-provider support in `lib/ai.ts`: `getAIProvider()`, `getAIClient()`, `getDefaultModel()`
- Logging wrapper: `chatWithLogging()` and `streamChatWithLogging()` auto-save to `AIConversation` table
- All prompts centralized in `lib/prompts/index.ts` (40+ specialized prompts)
- Embedding support: `createEmbedding()` for text/multimodal vectors

**Document Processing**:
- PDF parsing: Volcano Visual API (`lib/volcano-visual.ts`)
- Vector embeddings: Text chunking → embeddings → stored in `DocumentChunk`
- RAG search: Cosine similarity in `lib/rag.ts` → retrieve relevant chunks → feed to LLM

**Payment Flow**:
1. User selects product → creates `Order` with `PENDING` status
2. Frontend initiates Alipay page payment
3. Alipay redirects to `/payment/return` → user sees "processing" page
4. Alipay sends async notification → `/api/payment/notify` → verifies signature → updates order → grants membership/credits
5. Frontend polls `/api/payment/orders/[orderId]/status` to refresh UI

**CNKI Search Integration**:
- `lib/neki.ts` exports `parseCNKIResults()` and `convertUserTopicToCNKIQuery()`
- User provides natural language → AI converts to CNKI syntax → results parsed and displayed

## Key Files

**Core Configuration**:
- `prisma/schema.prisma` - Complete database schema (400+ lines)
- `lib/auth.ts` - NextAuth configuration with credentials + phone providers
- `lib/ai.ts` - AI client factory with logging and multi-provider support
- `lib/prompts/index.ts` - All AI prompts (ideation, search, writing, analysis, etc.)

**Business Logic**:
- `lib/credits.ts` - Credit system: checking, deduction, transaction logging
- `lib/alipay.ts` - Alipay SDK wrapper for payments
- `lib/tos.ts` - Volcano TOS file upload/download
- `lib/volcano-visual.ts` - PDF/image OCR
- `lib/rag.ts` - RAG pipeline: similarity search + context assembly
- `lib/embedding-utils.ts` - Text chunking and batch embedding

**Utilities**:
- `lib/prisma.ts` - Prisma client singleton
- `lib/pdf-page-count.ts` - PDF page counting for OCR cost calculation
- `scripts/create-user.ts` - CLI tool to create users manually
