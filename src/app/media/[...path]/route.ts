import { NextResponse } from "next/server";
import { loadMedia } from "@/lib/storage";

export const dynamic = "force-dynamic";

const notFound = () => new NextResponse("Not found", { status: 404 });

/**
 * 업로드한 이미지를 서빙한다.
 * - STORAGE_DRIVER=local → uploads 디렉터리에서 읽음
 *   (public/ 은 빌드 시점 스냅샷이라 런타임에 추가된 파일을 못 내보낸다)
 * - STORAGE_DRIVER=db → MediaFile 테이블에서 읽음 (서버리스 배포의 기본값)
 * - STORAGE_DRIVER=s3 → 이미지 URL이 버킷을 직접 가리키므로 이 라우트는 쓰이지 않음
 */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const segments = (await params).path;

  // 경로 탈출(../) 차단
  if (segments.some((segment) => segment === ".." || segment.includes("/") || segment.includes("\\"))) {
    return notFound();
  }

  const media = await loadMedia(segments.join("/"));
  if (!media) return notFound();

  return new NextResponse(media.body, {
    headers: {
      "Content-Type": media.contentType,
      "Content-Length": String(media.size),
      // 파일 이름이 UUID라 내용이 바뀌지 않는다 — 길게 캐싱해도 안전하다.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
