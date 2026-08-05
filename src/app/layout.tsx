import type { Metadata } from "next";
import { SITE, SITE_DESCRIPTION, SITE_KEYWORDS, SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
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
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "ko_KR",
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
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NAVER_SITE_VERIFICATION
      ? { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION }
      : undefined,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
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
