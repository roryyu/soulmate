-- CreateTable
CREATE TABLE "EvaluationSetting" (
    "id" TEXT NOT NULL,
    "type" TEXT,
    "question" TEXT,
    "options" TEXT,
    "weight" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationSetting_pkey" PRIMARY KEY ("id")
);
