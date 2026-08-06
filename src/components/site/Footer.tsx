import { TrackedExternalLink, TrackedLink } from "@/components/analytics/TrackedLink";
import { EVENTS } from "@/lib/analytics";
import { SITE } from "@/lib/site";
import { dict, withLang } from "@/lib/i18n";
import { currentLang } from "@/lib/lang-server";

export async function Footer() {
  const lang = await currentLang();
  const t = dict(lang);
  return (
    <footer className="mt-auto border-t border-line6">
      <div className="page-shell flex flex-col gap-4 py-8">
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
          <TrackedLink
            href={withLang(lang, "/terms")}
            className="text-fg55 hover:text-fg"
            event={EVENTS.nav}
            params={{ label: "이용약관", nav_to: "/terms", nav_source: "푸터" }}
          >
            {t.footerTerms}
          </TrackedLink>
          {/* 개인정보처리방침은 다른 항목보다 눈에 띄게 표시한다 */}
          <TrackedLink
            href={withLang(lang, "/privacy")}
            className="font-bold text-fg hover:text-fg"
            event={EVENTS.nav}
            params={{ label: "개인정보처리방침", nav_to: "/privacy", nav_source: "푸터" }}
          >
            {t.footerPrivacy}
          </TrackedLink>
          <TrackedExternalLink
            href={`mailto:${SITE.email}`}
            className="text-fg55 hover:text-fg"
            event={EVENTS.nav}
            params={{ label: "문의 메일", nav_source: "푸터" }}
          >
            {t.footerContact}
          </TrackedExternalLink>
        </nav>

        <p className="max-w-[720px] text-xs leading-relaxed text-fg40">
          {t.footerDisclaimer}{" "}
          <a href={`mailto:${SITE.email}`} className="text-fg55 underline underline-offset-2">
            {SITE.email}
          </a>
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg32">
          <span>{t.footerOperator} · {SITE.operator}</span>
          <span className="text-fg22">|</span>
          <span>{SITE.email}</span>
          <span className="text-fg22">|</span>
          <span>{t.footerRights}</span>
        </div>
      </div>
    </footer>
  );
}
