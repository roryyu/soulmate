-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "prompt" TEXT,
    "arguments" TEXT,
    "etag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);
