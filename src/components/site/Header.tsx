"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "@/components/icons";

const ACTIVE = "text-fg font-bold";
const INACTIVE = "text-fg55 font-medium";

const NAV = [
  { href: "/", label: "홈" },
  { href: "/category", label: "카테고리" },
  { href: "/board", label: "게시판", badge: "OPEN 예정" },
];

export function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const isSearch = pathname === "/search";
  const [query, setQuery] = useState(isSearch ? (searchParams.get("q") ?? "") : "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 검색 화면을 벗어나거나 URL 검색어가 바뀌면 입력값을 다시 맞춰준다.
  useEffect(() => {
    if (isSearch) setQuery(searchParams.get("q") ?? "");
  }, [isSearch, searchParams]);

  useEffect(() => () => { if (debounce.current) clearTimeout(debounce.current); }, []);

  const goSearch = (value: string) => {
    router.push(value.trim() ? `/search?q=${encodeURIComponent(value.trim())}` : "/search");
  };

  const onChange = (value: string) => {
    setQuery(value);
    // 상세·게시판 화면 위에서 입력을 시작하면 자동으로 검색 화면으로 전환된다.
    const autoSwitch = isSearch || pathname.startsWith("/content/") || pathname === "/board";
    if (!autoSwitch) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => goSearch(value), 300);
  };

  const navClass = (active: boolean) => `whitespace-nowrap text-sm ${active ? ACTIVE : INACTIVE}`;
  const isSubmit = pathname === "/submit";

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
        placeholder="작품, 감독, 작가로 검색"
        aria-label="작품 검색"
        className="min-w-0 flex-1 border-none bg-transparent text-[13px] text-fg outline-none"
      />
    </div>
  );

  const navLinks = NAV.map((nav) => (
    <Link key={nav.href} href={nav.href} className={navClass(pathname === nav.href)}>
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
    </Link>
  ));

  return (
    <header className="sticky top-0 z-50 border-b border-line8 bg-[rgba(11,10,15,0.85)] backdrop-blur-[14px]">
      <div className="page-shell flex h-16 items-center justify-between gap-4 lg:h-[72px] lg:gap-6">
        <div className="flex min-w-0 items-center gap-12">
          <Link
            href="/"
            className="flex flex-none gap-px text-xl font-extrabold tracking-[-0.5px] text-fg hover:text-fg lg:text-[22px]"
          >
            Dr.<span className="text-accent">GL</span>
          </Link>
          {/* 데스크톱에서만 헤더 한 줄에 nav 를 같이 둔다 */}
          <nav className="hidden items-center gap-8 lg:flex">{navLinks}</nav>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 lg:flex-none lg:gap-6">
          <div className="min-w-0 flex-1 lg:w-[280px] lg:flex-none">{searchBox}</div>
          <Link
            href="/submit"
            className={
              isSubmit
                ? "btn-grad h-10 flex-none whitespace-nowrap px-3 text-[13px] lg:px-4"
                : "inline-flex h-10 flex-none cursor-pointer items-center whitespace-nowrap rounded-[10px] border border-[rgba(155,126,232,0.4)] bg-accent-soft8 px-3 text-[13px] font-bold text-accent lg:px-4"
            }
          >
            <span className="lg:hidden">+ 제보</span>
            <span className="hidden lg:inline">+ 제보하기</span>
          </Link>
        </div>
      </div>

      {/* 모바일에서는 nav 를 두 번째 줄로 내리고, 넘치면 가로로 스크롤한다 */}
      <nav className="page-shell h-scroll flex items-center gap-6 pb-3 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navLinks}
      </nav>
    </header>
  );
}
