import { CategoryManager } from "@/components/admin/CategoryManager";
import { getCategoriesWithCount } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  return <CategoryManager initialCategories={await getCategoriesWithCount()} />;
}
