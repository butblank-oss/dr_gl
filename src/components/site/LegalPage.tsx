import Link from "next/link";
import { Markdown } from "@/components/site/Markdown";
import type { LegalVersionDTO } from "@/lib/types";

/** 시행일은 날짜만 쓰므로 UTC 기준으로 읽어 시간대에 따라 하루 밀리지 않게 한다. */
export function formatEffectiveDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}

type Props = {
  title: string;
  slug: string;
  version: LegalVersionDTO;
  /** 발행된 적 있는 모든 버전 (최신순) */
  history: LegalVersionDTO[];
  /** 지난 버전을 보고 있는 경우 안내 배너를 띄운다 */
  isArchived?: boolean;
};

export function LegalDocumentView({ title, slug, version, history, isArchived = false }: Props) {
  return (
    <div className="page-shell max-w-[760px] py-10 md:py-14">
      <h1 className="text-[26px] font-extrabold md:text-[30px]">{title}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg40">
        <span>시행일 · {formatEffectiveDate(version.effectiveDate)}</span>
        <span className="text-fg22">|</span>
        <span>v{version.version}</span>
        {version.changeNote ? (
          <>
            <span className="text-fg22">|</span>
            <span>{version.changeNote}</span>
          </>
        ) : null}
      </div>

      {isArchived ? (
        <div className="mt-5 rounded-[10px] border border-[rgba(229,72,107,0.3)] bg-danger-soft8 px-4 py-3 text-[13px] leading-relaxed text-fg72">
          이 문서는 <strong className="font-semibold text-fg">지난 버전(v{version.version})</strong>입니다.
          현재 적용되는 내용은{" "}
          <Link href={`/${slug}`} className="font-semibold text-accent">
            최신 {title}
          </Link>
          을 확인해주세요.
        </div>
      ) : null}

      <div className="mt-8">
        <Markdown body={version.body} />
      </div>

      {history.length > 1 ? (
        <section className="mt-14 border-t border-line8 pt-8">
          <h2 className="text-sm font-bold text-fg">개정 이력</h2>
          <p className="mt-2 text-xs text-fg40">지난 버전도 열람하실 수 있습니다.</p>
          <ul className="mt-4 flex list-none flex-col gap-0 pl-0">
            {history.map((entry) => {
              const current = entry.version === version.version;
              return (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line6 py-3 text-[13px]"
                >
                  <span className="w-[52px] flex-none font-semibold text-fg70">v{entry.version}</span>
                  <span className="w-[120px] flex-none text-fg55">
                    {formatEffectiveDate(entry.effectiveDate)}
                  </span>
                  <span className="min-w-0 flex-1 text-fg55">{entry.changeNote || "—"}</span>
                  {entry.isPublished ? (
                    <span className="rounded-pill bg-accent-soft px-2 py-[2px] text-[10px] font-bold text-accent">
                      현행
                    </span>
                  ) : null}
                  {current ? (
                    <span className="text-xs text-fg30">보는 중</span>
                  ) : (
                    <Link
                      href={entry.isPublished ? `/${slug}` : `/${slug}/${entry.version}`}
                      className="text-xs text-accent"
                    >
                      보기 →
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function LegalMissing({ title }: { title: string }) {
  return (
    <div className="page-shell max-w-[760px] py-20 text-center">
      <h1 className="text-[22px] font-extrabold">{title}</h1>
      <p className="mt-4 text-sm text-fg55">아직 등록된 내용이 없어요. 잠시 후 다시 확인해주세요.</p>
    </div>
  );
}
