-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "fileName" TEXT,
    "fileType" TEXT,
    "content" TEXT,
    "fileData" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "embeddingStatus" TEXT NOT NULL DEFAULT 'pending',
    "embeddingProgress" INTEGER NOT NULL DEFAULT 0,
    "embeddingError" TEXT,
    "directoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_directoryId_fkey" FOREIGN KEY ("directoryId") REFERENCES "Directory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ResearchDocument" ADD COLUMN "documentId" TEXT;

-- AddForeignKey
ALTER TABLE "ResearchDocument" ADD CONSTRAINT "ResearchDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ResearchDocument" DROP COLUMN "fileName",
DROP COLUMN "fileType",
DROP COLUMN "content",
DROP COLUMN "fileData",
DROP COLUMN "status",
DROP COLUMN "embeddingStatus",
DROP COLUMN "embeddingProgress",
DROP COLUMN "embeddingError";
