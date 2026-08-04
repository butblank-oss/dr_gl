import { SubmitForm } from "@/components/site/SubmitForm";
import { getCategories } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "콘텐츠 제보하기 · Dr. GL" };

export default async function SubmitPage() {
  const categories = await getCategories();
  return <SubmitForm categories={categories.map((c) => c.name)} />;
}
