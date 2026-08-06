import type { Metadata } from "next";
import { currentLang } from "@/lib/lang-server";
import { SITE, SITE_DESCRIPTION, SITE_KEYWORDS, SITE_URL, SITE_VERIFICATION } from "@/lib/site";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await currentLang();
  return {
  // 모든 상대 주소(OG 이미지, canonical)를 절대 주소로 바꾸는 기준
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Dr. GL · GL(백합) 콘텐츠 큐레이션 플랫폼",
    // 하위 페이지에서 title 만 주면 "제목 · Dr. GL" 로 붙는다
    template: "%s · Dr. GL",
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE.name,
  alternates: {
    // 언어판마다 자기 주소를 원본으로 선언한다. 서로를 가리키면 한쪽이 색인에서 빠진다.
    canonical: lang === "en" ? "/en" : "/",
    // 같은 화면의 다른 언어판이 어디 있는지 검색엔진에 알려준다.
    languages: { ko: "/", en: "/en", "x-default": "/" },
    // 새 작품이 올라온 걸 검색엔진이 빨리 알아채도록 RSS 를 알려준다
    types: { "application/rss+xml": [{ url: "/rss.xml", title: `${SITE.name} 새 작품` }] },
  },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: lang === "en" ? "en_US" : "ko_KR",
    url: SITE_URL,
    title: "Dr. GL · GL(백합) 콘텐츠 큐레이션 플랫폼",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Dr. GL · GL(백합) 콘텐츠 큐레이션 플랫폼",
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // 검색 결과에 미리보기 이미지·설명이 넉넉히 나오도록 제한을 풀어둔다
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // 검색엔진 소유 확인용. 환경변수를 넣으면 메타 태그가 자동으로 붙는다.
  // 국내 서비스라 네이버(서치어드바이저)도 함께 지원한다.
  verification: {
    google: SITE_VERIFICATION.google || undefined,
    other: SITE_VERIFICATION.naver
      ? { "naver-site-verification": SITE_VERIFICATION.naver }
      : undefined,
  },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // /en 으로 들어온 요청이면 html lang 도 en 이어야 한다 —
  // 브라우저의 자동 번역 제안과 검색엔진의 언어 판별이 모두 이 값을 본다.
  const lang = await currentLang();
  return (
    <html lang={lang}>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
