import { fail, handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { UploadError, storeImage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** 포스터·배경 이미지 업로드. 운영자 전용. */
export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin();

    const formData = await req.formData();
    const file = formData.get("file");
    const kind = String(formData.get("kind") ?? "poster");
    if (!(file instanceof File)) return fail("이미지 파일이 필요해요.", 400);

    try {
      const stored = await storeImage(file, kind === "backdrop" ? "backdrop" : "poster");
      return ok({ url: stored.url, key: stored.key }, 201);
    } catch (error) {
      if (error instanceof UploadError) return fail(error.message, 400);
      throw error;
    }
  });
}
