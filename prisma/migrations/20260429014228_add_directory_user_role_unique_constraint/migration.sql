/*
  Warnings:

  - A unique constraint covering the columns `[directoryId,userId]` on the table `DirectoryUserRole` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "DirectoryUserRole_directoryId_userId_key" ON "DirectoryUserRole"("directoryId", "userId");
