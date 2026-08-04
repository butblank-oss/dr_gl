import { SubmissionManager } from "@/components/admin/SubmissionManager";
import { prisma } from "@/lib/prisma";
import { getCategories } from "@/lib/queries";
import { serializeSubmission } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export default async function AdminSubmissionsPage() {
  const [rows, categories] = await Promise.all([
    prisma.submission.findMany({ orderBy: { id: "desc" } }),
    getCategories(),
  ]);

  return (
    <SubmissionManager
      initialSubmissions={rows.map(serializeSubmission)}
      categories={categories.map((c) => c.name)}
    />
  );
}
