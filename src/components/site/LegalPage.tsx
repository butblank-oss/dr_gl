import { SITE } from "@/lib/site";

/** 약관·처리방침 공통 레이아웃 */
export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="page-shell max-w-[760px] py-10 md:py-14">
      <h1 className="text-[26px] font-extrabold md:text-[30px]">{title}</h1>
      {intro ? <p className="mt-3 text-sm leading-relaxed text-fg55">{intro}</p> : null}
      <div className="mt-3 text-xs text-fg40">시행일 · {SITE.effectiveDate}</div>
      <div className="mt-8 flex flex-col gap-8">{children}</div>
    </div>
  );
}

export function Article({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-bold text-fg">{heading}</h2>
      <div className="flex flex-col gap-2.5 text-[14px] leading-[1.8] text-fg72">{children}</div>
    </section>
  );
}

export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex list-none flex-col gap-2 pl-0">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2.5">
          <span className="flex-none text-fg40">·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line8">
      <table className="w-full min-w-[420px] border-collapse text-[13px]">
        <thead>
          <tr className="bg-panel">
            {head.map((h) => (
              <th key={h} className="border-b border-line8 px-3.5 py-2.5 text-left font-semibold text-fg70">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="border-b border-line4 px-3.5 py-2.5 align-top leading-relaxed text-fg72">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
