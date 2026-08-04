import { fail, handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeLegalVersion } from "@/lib/serialize";
import { LEGAL_SLUGS } from "@/lib/types";
import { legalVersionCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

/** 새 버전 저장. 기존 버전은 그대로 남아 히스토리가 된다. */
export async function POST(req: Request, { params }: Params) {
  return handle(async () => {
    const me = await requireAdmin();
    const { slug } = await params;
    if (!LEGAL_SLUGS.includes(slug as (typeof LEGAL_SLUGS)[number])) {
      return fail("알 수 없는 문서예요.", 404);
    }

    const document = await prisma.legalDocument.findUnique({ where: { slug } });
    if (!document) return fail("문서를 찾을 수 없어요.", 404);

    const input = legalVersionCreateSchema.parse(await req.json());

    const created = await prisma.$transaction(async (tx) => {
      const last = await tx.legalDocumentVersion.findFirst({
        where: { documentId: document.id },
        orderBy: { version: "desc" },
      });
      const version = await tx.legalDocumentVersion.create({
        data: {
          documentId: document.id,
          version: (last?.version ?? 0) + 1,
          body: input.body,
          effectiveDate: new Date(`${input.effectiveDate}T00:00:00Z`),
          changeNote: input.changeNote,
          isPublished: input.publish,
          publishedAt: input.publish ? new Date() : null,
          createdById: me.id,
          createdByName: me.name || me.email,
        },
      });
      // 발행중인 버전은 문서당 하나뿐이어야 한다.
      if (input.publish) {
        await tx.legalDocumentVersion.updateMany({
          where: { documentId: document.id, id: { not: version.id } },
          data: { isPublished: false },
        });
      }
      return version;
    });

    return ok({ version: serializeLegalVersion(created) }, 201);
  });
}
