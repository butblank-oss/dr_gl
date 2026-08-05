-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "ipHash" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "Submission_ipHash_createdAt_idx" ON "Submission"("ipHash", "createdAt");
