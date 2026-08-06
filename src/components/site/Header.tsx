"use client";

import { usePathname } from "next/navigation";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { useGoBack } from "@/components/site/useGoBack";
import { EVENTS, track } from "@/lib/analytics";
import { LangSwitch } from "@/components/site/LangSwitch";
import { dict, langFromPath, stripLang, withLang } from "@/lib/i18n";

const ACTIVE = "text-fg font-bold";
const INACTIVE = "text-fg55 font-medium";


export function Header() {
  const pathname = usePathname();
  const lang = langFromPath(pathname);
  const t = dict(lang);
  // 주소 판정은 /en 을 뗀 경로로 한다. 그래야 한국어·영어 화면이 같은 규칙을 쓴다.
  const bare = stripLang(pathname);
  // 검색을 nav 에 둔다 — 헤더에서 검색창을 뺐으니 어디서든 닿을 길이 하나는 있어야 한다.
  const NAV = [
    { href: "/", label: t.navHome },
    { href: "/category", label: t.navCategory },
    { href: "/search", label: t.navSearch },
    { href: "/board", label: t.navBoard, badge: t.navBoardBadge },
  ];

  const goBack = useGoBack();
  // 상세 화면에서는 스크롤 위치와 상관없이 항상 닿는 뒤로가기를 헤더에 둔다.
  // (iOS 사파리의 스와이프 뒤로가기는 화면 맨 왼쪽 가장자리에서만 동작한다)
  const isDetail = bare.startsWith("/content/");
  const navClass = (active: boolean) => `whitespace-nowrap text-sm ${active ? ACTIVE : INACTIVE}`;

  const navLinks = NAV.map((nav) => (
    <TrackedLink
      key={nav.href}
      href={withLang(lang, nav.href)}
      className={navClass(bare === nav.href)}
      event={EVENTS.nav}
      params={{ label: nav.label, nav_to: nav.href, nav_from: pathname }}
    >
      {nav.badge ? (
        <span className="flex items-center gap-[7px]">
          {nav.label}
          <span className="rounded-pill bg-accent-soft px-[7px] py-[2px] text-[10px] font-bold text-accent">
            {nav.badge}
          </span>
        </span>
      ) : (
        nav.label
      )}
    </TrackedLink>
  ));

  return (
    <header className="sticky top-0 z-50 border-b border-line8 bg-[rgba(11,10,15,0.85)] backdrop-blur-[14px]">
      <div className="page-shell flex h-16 items-center justify-between gap-4 lg:h-[72px] lg:gap-6">
        <div className="flex min-w-0 items-center gap-4 lg:gap-12">
          {isDetail ? (
            <button
              type="button"
              onClick={() => {
                track(EVENTS.nav, { label: "뒤로가기", nav_from: pathname });
                goBack();
              }}
              aria-label={t.back}
              className="-ml-1 flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full text-fg75 hover:bg-surface6 lg:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          ) : null}
          <TrackedLink
            href={withLang(lang, "/")}
            className="flex flex-none gap-px text-xl font-extrabold tracking-[-0.5px] text-fg hover:text-fg lg:text-[22px]"
            event={EVENTS.nav}
            params={{ label: "로고", nav_to: "/", nav_from: pathname }}
          >
            Dr.<span className="text-accent">GL</span>
          </TrackedLink>
          {/* 데스크톱에서만 헤더 한 줄에 nav 를 같이 둔다 */}
          <nav className="hidden items-center gap-8 lg:flex">{navLinks}</nav>
        </div>

        <LangSwitch />
      </div>

      {/* 모바일에서는 nav 를 두 번째 줄로 내리고, 넘치면 가로로 스크롤한다 */}
      <nav className="page-shell h-scroll flex items-center gap-6 pb-3 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navLinks}
      </nav>
    </header>
  );
}
