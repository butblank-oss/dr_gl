import { Suspense } from "react";
import { Analytics } from "@/components/analytics/Analytics";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { NavTracker } from "@/components/site/NavTracker";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink text-fg">
      {/* useSearchParams 를 쓰므로 Suspense 안에 둔다 */}
      <Suspense fallback={null}>
        <Analytics />
      </Suspense>
      <Suspense fallback={<div className="h-[72px] border-b border-line8" />}>
        <Header />
      </Suspense>
      <NavTracker />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
