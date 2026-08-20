-- CreateTable
CREATE TABLE "Label" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Label_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TocDataLabel" (
    "id" TEXT NOT NULL,
    "tocDataId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TocDataLabel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Label_name_key" ON "Label"("name");

-- CreateIndex
CREATE INDEX "TocDataLabel_labelId_idx" ON "TocDataLabel"("labelId");

-- CreateIndex
CREATE UNIQUE INDEX "TocDataLabel_tocDataId_labelId_key" ON "TocDataLabel"("tocDataId", "labelId");

-- AddForeignKey
ALTER TABLE "TocDataLabel" ADD CONSTRAINT "TocDataLabel_tocDataId_fkey" FOREIGN KEY ("tocDataId") REFERENCES "TocData"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TocDataLabel" ADD CONSTRAINT "TocDataLabel_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE;
