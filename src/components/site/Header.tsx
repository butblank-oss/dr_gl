"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "@/components/icons";

const ACTIVE = "text-fg font-bold";
const INACTIVE = "text-fg55 font-medium";

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

  const navClass = (active: boolean) => `cursor-pointer text-sm ${active ? ACTIVE : INACTIVE}`;
  const isSubmit = pathname === "/submit";

  return (
    <header className="sticky top-0 z-50 border-b border-line8 bg-[rgba(11,10,15,0.85)] backdrop-blur-[14px]">
      <div className="page-shell flex h-[72px] items-center justify-between gap-6">
      <div className="flex items-center gap-12">
        <Link
          href="/"
          className="flex flex-none gap-px text-[22px] font-extrabold tracking-[-0.5px] text-fg hover:text-fg"
        >
          Dr.<span className="text-accent">GL</span>
        </Link>
        <nav className="flex items-center gap-8">
          <Link href="/" className={navClass(pathname === "/")}>
            홈
          </Link>
          <Link href="/category" className={navClass(pathname === "/category")}>
            카테고리
          </Link>
          <Link href="/board" className={`flex items-center gap-[7px] ${navClass(pathname === "/board")}`}>
            게시판
            <span className="rounded-pill bg-accent-soft px-[7px] py-[2px] text-[10px] font-bold text-accent">
              OPEN 예정
            </span>
          </Link>
          <Link
            href="/submit"
            className={
              isSubmit
                ? "btn-grad h-10 whitespace-nowrap px-4 text-[13px]"
                : "inline-flex h-10 cursor-pointer items-center whitespace-nowrap rounded-[10px] border border-[rgba(155,126,232,0.4)] bg-accent-soft8 px-4 text-[13px] font-bold text-accent"
            }
          >
            + 제보하기
          </Link>
        </nav>
      </div>
      <div className="flex h-10 w-[280px] flex-none items-center gap-2.5 rounded-[10px] border border-line8 bg-search px-3.5">
        <SearchIcon className="text-fg40" />
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
      </div>
    </header>
  );
}
