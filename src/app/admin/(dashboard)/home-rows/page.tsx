import { HomeRowManager } from "@/components/admin/HomeRowManager";
import { prisma } from "@/lib/prisma";
import { FEATURED_SETTING_KEY, getAllContents, getAllHomeRows } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminHomeRowsPage() {
  const [rows, allContents, featuredSetting] = await Promise.all([
    getAllHomeRows(),
    getAllContents(),
    prisma.siteSetting.findUnique({ where: { key: FEATURED_SETTING_KEY } }),
  ]);

  const featuredId = Number(featuredSetting?.value);

  return (
    <HomeRowManager
      initialRows={rows}
      allContents={allContents}
      featuredId={Number.isInteger(featuredId) ? featuredId : null}
    />
  );
}
