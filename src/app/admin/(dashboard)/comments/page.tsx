import { CommentManager } from "@/components/admin/CommentManager";
import { prisma } from "@/lib/prisma";
import { serializeComment } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export default async function AdminCommentsPage() {
  const rows = await prisma.comment.findMany({
    orderBy: { id: "desc" },
    include: { item: { select: { title: true } } },
  });

  return (
    <CommentManager
      initialComments={rows.map((row) => ({ ...serializeComment(row), itemTitle: row.item.title }))}
    />
  );
}
