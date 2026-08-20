/*
  Warnings:

  - You are about to drop the column `framework` on the `DocumentAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `keyPages` on the `DocumentAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `keyPoints` on the `DocumentAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `methodology` on the `DocumentAnalysis` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `DocumentAnalysis` table. All the data in the column will be lost.
  - Added the required column `content` to the `DocumentAnalysis` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DocumentAnalysis" DROP COLUMN "framework",
DROP COLUMN "keyPages",
DROP COLUMN "keyPoints",
DROP COLUMN "methodology",
DROP COLUMN "summary",
ADD COLUMN     "content" TEXT NOT NULL;
