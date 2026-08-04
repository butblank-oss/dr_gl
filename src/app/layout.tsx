import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dr. GL · GL 콘텐츠 큐레이션 플랫폼",
  description:
    "영화·드라마·웹툰·웹소설·소설·애니·만화 등 GL(백합) 콘텐츠를 한곳에 모아 소개·추천하고, 어디서 볼 수 있는지 연결해주는 콘텐츠 큐레이션 플랫폼.",
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
