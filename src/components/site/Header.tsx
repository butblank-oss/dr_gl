"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { SearchIcon } from "@/components/icons";
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
  const NAV = [
    { href: "/", label: t.navHome },
    { href: "/category", label: t.navCategory },
    { href: "/board", label: t.navBoard, badge: t.navBoardBadge },
  ];
  const searchParams = useSearchParams();
  const router = useRouter();

  const goBack = useGoBack();
  const isSearch = bare === "/search";
  // 상세 화면에서는 스크롤 위치와 상관없이 항상 닿는 뒤로가기를 헤더에 둔다.
  // (iOS 사파리의 스와이프 뒤로가기는 화면 맨 왼쪽 가장자리에서만 동작한다)
  const isDetail = bare.startsWith("/content/");
  const [query, setQuery] = useState(isSearch ? (searchParams.get("q") ?? "") : "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 검색 화면을 벗어나거나 URL 검색어가 바뀌면 입력값을 다시 맞춰준다.
  useEffect(() => {
    if (isSearch) setQuery(searchParams.get("q") ?? "");
  }, [isSearch, searchParams]);

  useEffect(() => () => { if (debounce.current) clearTimeout(debounce.current); }, []);

  // 검색어 자체(search 이벤트)는 결과 건수까지 같이 남길 수 있는 검색 화면에서 한 번만 기록한다.
  const goSearch = (value: string) => {
    const term = value.trim();
    router.push(withLang(lang, term ? `/search?q=${encodeURIComponent(term)}` : "/search"));
  };

  const onChange = (value: string) => {
    setQuery(value);
    // 상세·게시판 화면 위에서 입력을 시작하면 자동으로 검색 화면으로 전환된다.
    const autoSwitch = isSearch || bare.startsWith("/content/") || bare === "/board";
    if (!autoSwitch) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => goSearch(value), 300);
  };

  const navClass = (active: boolean) => `whitespace-nowrap text-sm ${active ? ACTIVE : INACTIVE}`;
  const isSubmit = bare === "/submit";

  const searchBox = (
    <div className="flex h-10 min-w-0 items-center gap-2.5 rounded-[10px] border border-line8 bg-search px-3.5">
      <SearchIcon className="flex-none text-fg40" />
      <input
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (debounce.current) clearTimeout(debounce.current);
            goSearch(query);
          }
        }}
        placeholder={t.searchPlaceholder}
        aria-label={t.searchAria}
        className="min-w-0 flex-1 border-none bg-transparent text-[13px] text-fg outline-none"
      />
    </div>
  );

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

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 lg:flex-none lg:gap-6">
          <div className="min-w-0 flex-1 lg:w-[280px] lg:flex-none">{searchBox}</div>
          <TrackedLink
            href={withLang(lang, "/submit")}
            event={EVENTS.nav}
            params={{ label: "제보하기", nav_to: "/submit", nav_from: pathname, nav_source: "헤더" }}
            className={
              isSubmit
                ? "btn-grad h-10 flex-none whitespace-nowrap px-3 text-[13px] lg:px-4"
                : "inline-flex h-10 flex-none cursor-pointer items-center whitespace-nowrap rounded-[10px] border border-[rgba(155,126,232,0.4)] bg-accent-soft8 px-3 text-[13px] font-bold text-accent lg:px-4"
            }
          >
            <span className="lg:hidden">{t.submitShort}</span>
            <span className="hidden lg:inline">{t.submitLong}</span>
          </TrackedLink>
          <LangSwitch />
        </div>
      </div>

      {/* 모바일에서는 nav 를 두 번째 줄로 내리고, 넘치면 가로로 스크롤한다 */}
      <nav className="page-shell h-scroll flex items-center gap-6 pb-3 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navLinks}
      </nav>
    </header>
  );
}
