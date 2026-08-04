import { ContentManager } from "@/components/admin/ContentManager";
import { getAllContents, getCategories } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const [items, categories] = await Promise.all([getAllContents(), getCategories()]);
  return <ContentManager initialItems={items} categories={categories.map((c) => c.name)} />;
}
