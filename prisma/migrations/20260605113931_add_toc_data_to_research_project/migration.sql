-- AlterTable
ALTER TABLE "ResearchProject" ADD COLUMN     "tocDataId" TEXT;

-- AddForeignKey
ALTER TABLE "ResearchProject" ADD CONSTRAINT "ResearchProject_tocDataId_fkey" FOREIGN KEY ("tocDataId") REFERENCES "TocData"("id") ON DELETE SET NULL ON UPDATE CASCADE;
