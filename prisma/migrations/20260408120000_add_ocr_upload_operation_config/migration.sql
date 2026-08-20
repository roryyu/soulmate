-- 文献上传 PDF OCR：按页数分档计费，creditCost 表示「每 100 页一档」的单价（默认 10）
INSERT INTO "AIOperationConfig" ("id", "operationType", "creditCost", "description", "isActive", "updatedAt")
VALUES (
  'clocruploadcfg0000001',
  'OCR_UPLOAD',
  10,
  '文献上传 PDF OCR：每满100页按一档扣费，不足100页按一档；单价为「每档」积分',
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("operationType") DO NOTHING;
