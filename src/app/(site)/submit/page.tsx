import { Suspense } from "react";
import { SubmitForm } from "@/components/site/SubmitForm";
import { getCategories } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "콘텐츠 제보하기",
  description: "놓치기 아까운 GL(백합) 작품을 알려주세요. 운영팀 검토 후 목록에 등록됩니다.",
  alternates: { canonical: "/submit" },
};

export default async function SubmitPage() {
  const categories = await getCategories();
  return (
    <Suspense fallback={<div className="page-shell py-14" />}>
      <SubmitForm categories={categories.map((c) => c.name)} />
    </Suspense>
  );
}
