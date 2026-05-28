/*
  Warnings:

  - You are about to drop the column `url` on the `MusicCoverResource` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MusicCoverResource" DROP COLUMN "url",
ADD COLUMN     "musicCoverId" TEXT;

-- CreateTable
CREATE TABLE "MusicCover" (
    "id" TEXT NOT NULL,
    "coverFeatureId" TEXT,
    "structureResult" TEXT,
    "formattedLyrics" TEXT,
    "audioDuration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MusicCover_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MusicCoverResource" ADD CONSTRAINT "MusicCoverResource_musicCoverId_fkey" FOREIGN KEY ("musicCoverId") REFERENCES "MusicCover"("id") ON DELETE CASCADE ON UPDATE CASCADE;
