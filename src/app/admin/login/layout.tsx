import type { Metadata } from "next";

// 로그인 화면도 검색에 노출되면 안 된다.
export const metadata: Metadata = {
  title: "Dr. GL Admin 로그인",
  robots: { index: false, follow: false },
};

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
