import type { Metadata } from "next";

// 게시판 화면 자체는 클라이언트 컴포넌트라 메타데이터를 여기서 선언한다.
export const metadata: Metadata = {
  title: "게시판 — 곧 열립니다",
  description:
    "Dr. GL 게시판을 준비하고 있습니다. 작품 후기와 추천을 나누는 공간이 열리면 알려드릴게요.",
  alternates: { canonical: "/board" },
};

export default function BoardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
