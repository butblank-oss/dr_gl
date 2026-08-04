import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { MEDIA_CONTENT_TYPES, uploadRoot } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * 로컬 스토리지 드라이버로 올린 이미지를 서빙한다.
 * (public/ 은 빌드 시점 스냅샷이라 런타임에 추가된 파일을 내보내지 못한다)
 * STORAGE_DRIVER=s3 이면 이미지 URL이 버킷을 직접 가리키므로 이 라우트는 쓰이지 않는다.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const segments = (await params).path;

  // 경로 탈출(../) 차단
  if (segments.some((segment) => segment === ".." || segment.includes("/") || segment.includes("\\"))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const root = uploadRoot();
  const target = path.join(root, ...segments);
  if (!target.startsWith(root + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const contentType = MEDIA_CONTENT_TYPES[path.extname(target).toLowerCase()];
  if (!contentType) return new NextResponse("Not found", { status: 404 });

  try {
    const info = await stat(target);
    if (!info.isFile()) return new NextResponse("Not found", { status: 404 });

    const file = await readFile(target);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        // 파일 이름이 UUID라 내용이 바뀌지 않는다 — 길게 캐싱해도 안전하다.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
