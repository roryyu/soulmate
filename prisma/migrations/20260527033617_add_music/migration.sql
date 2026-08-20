-- AlterTable
ALTER TABLE "ResearchProject" ADD COLUMN     "bitrate" INTEGER NOT NULL DEFAULT 256000,
ADD COLUMN     "format" TEXT NOT NULL DEFAULT 'mp3',
ADD COLUMN     "prompt" TEXT,
ADD COLUMN     "sampleRate" INTEGER NOT NULL DEFAULT 44100;

-- CreateTable
CREATE TABLE "MusicCoverResource" (
    "id" TEXT NOT NULL,
    "researchProjectId" TEXT,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MusicCoverResource_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MusicCoverResource" ADD CONSTRAINT "MusicCoverResource_researchProjectId_fkey" FOREIGN KEY ("researchProjectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
