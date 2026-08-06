"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { SearchIcon } from "@/components/icons";
import { dict, langFromPath, withLang } from "@/lib/i18n";

/**
 * 본문에 놓는 검색창.
 *
 * 검색 버튼은 항상 보인다. 한때 좁은 화면에서 숨겼더니, 검색어를 치고 나서
 * 옆에 있던 제보 버튼을 누르는 사람이 생겼다. 입력칸 옆의 버튼은 그 입력을 처리하는 것이어야 한다.
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
          className="flex-none cursor-pointer rounded-lg bg-accent px-3.5 py-2 text-xs font-bold text-white hover:brightness-110"
        >
          {t.searchTitle}
        </button>
      </div>
    </div>
  );
}
