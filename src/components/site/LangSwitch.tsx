"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { EN_PREFIX, dict, langFromPath, stripLang } from "@/lib/i18n";
import { EVENTS, track } from "@/lib/analytics";

/**
 * 한국어 ↔ 영어 전환.
 * 보고 있던 화면을 그대로 유지한 채 언어만 바꾼다 — 홈으로 튕기면 읽던 작품을 잃는다.
 */
export function LangSwitch({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lang = langFromPath(pathname);
  const t = dict(lang);

  const bare = stripLang(pathname);
  const query = searchParams.toString();
  const target = (lang === "ko" ? `${EN_PREFIX}${bare === "/" ? "" : bare}` || EN_PREFIX : bare) +
    (query ? `?${query}` : "");

  // 지금 화면의 반대쪽 국기를 보여준다 — 누르면 그 언어로 간다는 뜻이 되도록.
  const flag = lang === "ko" ? "🇺🇸" : "🇰🇷";

  return (
    // 언어 전환은 늘 서버를 한 번 더 거친다 (TrackedLink 의 설명과 같은 이유)
    <a
      href={target}
      hrefLang={lang === "ko" ? "en" : "ko"}
      aria-label={t.langAria}
      title={t.langAria}
      onClick={() => track(EVENTS.nav, { label: "언어 전환", nav_to: target, nav_from: pathname })}
      className={
        className ||
        "inline-flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full border border-line12 bg-surface4 text-base leading-none hover:bg-surface6"
      }
    >
      <span aria-hidden>{flag}</span>
    </a>
  );
}
