-- CreateTable
CREATE TABLE "AnalyticsReport" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "metrics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsReport_kind_createdAt_idx" ON "AnalyticsReport"("kind", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsReport_kind_periodStart_key" ON "AnalyticsReport"("kind", "periodStart");
