import type { Metadata } from "next";
import { LegalDocumentView, LegalMissing } from "@/components/site/LegalPage";
import { getLegalDocument } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "이용약관 · Dr. GL" };

export default async function TermsPage() {
  const doc = await getLegalDocument("terms");
  if (!doc?.published) return <LegalMissing title="이용약관" />;

  return (
    <LegalDocumentView
      title={doc.title}
      slug={doc.slug}
      version={doc.published}
      history={doc.history}
    />
  );
}
