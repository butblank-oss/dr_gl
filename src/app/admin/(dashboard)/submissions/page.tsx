import { SubmissionManager } from "@/components/admin/SubmissionManager";
import { duplicatesFor } from "@/lib/duplicate";
import { prisma } from "@/lib/prisma";
import { getCategories } from "@/lib/queries";
import { serializeSubmission } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage() {
  const [rows, categories] = await Promise.all([
    prisma.submission.findMany({ orderBy: { id: "desc" } }),
    getCategories(),
  ]);

  // 대기중인 제보만 기존 작품과 대조한다 — 이미 처리한 건 다시 볼 일이 없다.
  const duplicates = await duplicatesFor(rows.filter((row) => row.status === "pending"));

  return (
    <SubmissionManager
      initialSubmissions={rows.map(serializeSubmission)}
      initialDuplicates={duplicates}
      categories={categories.map((c) => c.name)}
    />
  );
}
