/*
  Warnings:

  - You are about to drop the column `embeddingError` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `embeddingProgress` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `embeddingStatus` on the `Document` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "embeddingError",
DROP COLUMN "embeddingProgress",
DROP COLUMN "embeddingStatus";

-- AlterTable
ALTER TABLE "ResearchDocument" ADD COLUMN     "embeddingError" TEXT,
ADD COLUMN     "embeddingProgress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "embeddingStatus" TEXT NOT NULL DEFAULT 'pending';
