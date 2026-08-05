import type { Metadata } from "next";
import { LegalDocumentView, LegalMissing } from "@/components/site/LegalPage";
import { getLegalDocument } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "개인정보처리방침", alternates: { canonical: "/privacy" } };

export default async function PrivacyPage() {
  const doc = await getLegalDocument("privacy");
  if (!doc?.published) return <LegalMissing title="개인정보처리방침" />;

  return (
    <LegalDocumentView
      title={doc.title}
      slug={doc.slug}
      version={doc.published}
      history={doc.history}
    />
  );
}
