# Prisma 开发规则：
1. **严禁使用** `prisma db push`（为了保留完整的 SQL 迁移历史）。
2. **本地修改数据库**：每次改完 schema 后，必须让我使用 `npx prisma migrate dev --name <简短的修改说明>`。
3. **生产环境部署**：只能提供 `npx prisma migrate deploy` 命令。