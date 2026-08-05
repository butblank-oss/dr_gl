-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "rejectNote" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "rejectReason" TEXT NOT NULL DEFAULT '';
