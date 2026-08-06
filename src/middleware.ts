import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-shared";
import { EN_PREFIX, stripLang } from "@/lib/i18n";

/**
 * 어드민 라우트의 1차 관문. 쿠키가 없으면 곧바로 로그인으로 보낸다.
 * (실제 세션 검증·역할 확인은 서버 컴포넌트와 API 라우트에서 한 번 더 수행)
 */
/** 어드민 파비콘 등 메타데이터 파일은 로그인 전에도 브라우저가 받아갈 수 있어야 한다. */
const PUBLIC_ADMIN_ASSET = /^\/admin\/(icon|apple-icon|favicon)[\w.-]*\.(svg|png|ico|jpg|jpeg)$/;

/** 서버 컴포넌트가 언어를 읽는 표식. lang-server.ts 의 LANG_HEADER 와 같은 값이어야 한다. */
const LANG_HEADER = "x-drgl-lang";

/**
 * /en/... 는 같은 페이지를 영어로 그린다.
 * 라우트 파일을 언어별로 복제하지 않고, 주소에서 접두어만 떼어 같은 페이지로 넘긴다.
 * redirect 가 아니라 rewrite 인 이유: 주소창에 /en 이 그대로 남아야 구글이 영어 주소로 색인한다.
 */
function englishRewrite(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = stripLang(url.pathname);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(LANG_HEADER, "en");
  return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname === EN_PREFIX || pathname.startsWith(`${EN_PREFIX}/`)) {
    // 어드민에는 영어판이 없다. /en/admin 으로 들어오면 한국어 어드민으로 돌려보낸다.
    if (stripLang(pathname).startsWith("/admin")) {
      const url = req.nextUrl.clone();
      url.pathname = stripLang(pathname);
      return NextResponse.redirect(url);
    }
    return englishRewrite(req);
  }

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
  matcher: ["/admin/:path*", "/en", "/en/:path*"],
};
