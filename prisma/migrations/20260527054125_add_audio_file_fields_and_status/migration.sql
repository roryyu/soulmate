-- AlterTable
ALTER TABLE "MusicCover" ADD COLUMN     "audioFilePath" TEXT,
ADD COLUMN     "audioFileUrl" TEXT,
ADD COLUMN     "error" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';
