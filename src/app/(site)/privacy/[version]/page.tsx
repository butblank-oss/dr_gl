import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocumentView } from "@/components/site/LegalPage";
import { getLegalDocument, getLegalVersion } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Params = Promise<{ version: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return { title: `개인정보처리방침 (v${(await params).version}) · Dr. GL` };
}

/** 지난 버전 열람 — 발행된 적 있는 버전만 볼 수 있다. */
export default async function PrivacyVersionPage({ params }: { params: Params }) {
  const version = Number((await params).version);
  if (!Number.isInteger(version) || version <= 0) notFound();

  const [entry, doc] = await Promise.all([
    getLegalVersion("privacy", version),
    getLegalDocument("privacy"),
  ]);
  if (!entry || !doc) notFound();

  return (
    <LegalDocumentView
      title={entry.title}
      slug={entry.slug}
      version={entry}
      history={doc.history}
      isArchived={!entry.isPublished}
    />
  );
}
