import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-shared";

/**
 * 어드민 라우트의 1차 관문. 쿠키가 없으면 곧바로 로그인으로 보낸다.
 * (실제 세션 검증·역할 확인은 서버 컴포넌트와 API 라우트에서 한 번 더 수행)
 */
/** 어드민 파비콘 등 메타데이터 파일은 로그인 전에도 브라우저가 받아갈 수 있어야 한다. */
const PUBLIC_ADMIN_ASSET = /^\/admin\/(icon|apple-icon|favicon)[\w.-]*\.(svg|png|ico|jpg|jpeg)$/;

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  if (PUBLIC_ADMIN_ASSET.test(pathname)) return NextResponse.next();

  if (!req.cookies.get(SESSION_COOKIE)?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
