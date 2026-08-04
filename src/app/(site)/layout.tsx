import { Suspense } from "react";
import { Header } from "@/components/site/Header";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink text-fg">
      <Suspense fallback={<div className="h-[72px] border-b border-line8" />}>
        <Header />
      </Suspense>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line6 px-10 py-6 text-xs text-fg32">
        © 2026 Dr. GL · GL 콘텐츠 큐레이션 플랫폼
      </footer>
    </div>
  );
}
