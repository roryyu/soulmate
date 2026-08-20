-- CreateTable
CREATE TABLE "TocData" (
    "id" TEXT NOT NULL,
    "key" TEXT,
    "etag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TocData_pkey" PRIMARY KEY ("id")
);
