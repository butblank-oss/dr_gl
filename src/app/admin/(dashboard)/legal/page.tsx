import { LegalManager } from "@/components/admin/LegalManager";
import { getAllLegalDocuments } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminLegalPage() {
  return <LegalManager initialDocuments={await getAllLegalDocuments()} />;
}
