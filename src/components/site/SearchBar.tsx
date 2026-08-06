"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { SearchIcon } from "@/components/icons";
import { EVENTS } from "@/lib/analytics";
import { dict, langFromPath, withLang } from "@/lib/i18n";

/**
 * 본문에 놓는 검색창 + 제보 버튼.
 *
 * 헤더에 로고·검색·제보·언어를 다 얹으니 위쪽이 꽉 막혀 보였다.
 * 검색과 제보는 "찾으러 온 사람"이 쓰는 것이라, 작품 목록 바로 위가 더 자연스러운 자리다.
 */
export function SearchBar({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const lang = langFromPath(pathname);
  const t = dict(lang);
  const [query, setQuery] = useState(initialQuery);

  const go = () => {
    const term = query.trim();
    router.push(withLang(lang, term ? `/search?q=${encodeURIComponent(term)}` : "/search"));
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-xl border border-line12 bg-search px-4">
        <SearchIcon className="flex-none text-fg40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") go();
          }}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchAria}
          className="min-w-0 flex-1 border-none bg-transparent text-sm text-fg outline-none"
        />
        <button
          type="button"
          onClick={go}
          aria-label={t.searchAria}
          className="hidden flex-none cursor-pointer rounded-lg bg-surface6 px-3 py-1.5 text-xs font-bold text-fg70 hover:text-fg sm:block"
        >
          {t.searchTitle}
        </button>
      </div>
      <TrackedLink
        href={withLang(lang, "/submit")}
        event={EVENTS.nav}
        params={{ label: "제보하기", nav_to: "/submit", nav_from: pathname, nav_source: "본문 검색줄" }}
        className="inline-flex h-12 flex-none items-center justify-center whitespace-nowrap rounded-xl border border-[rgba(155,126,232,0.4)] bg-accent-soft8 px-4 text-sm font-bold text-accent sm:px-5"
      >
        <span className="sm:hidden">{t.submitShort}</span>
        <span className="hidden sm:inline">{t.submitLong}</span>
      </TrackedLink>
    </div>
  );
}
