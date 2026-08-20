-- 中文注释：加速按项目拉取文献列表（WHERE projectId ORDER BY createdAt DESC）
CREATE INDEX "ResearchDocument_projectId_createdAt_idx" ON "ResearchDocument"("projectId", "createdAt");
