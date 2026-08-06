/** GA4의 date 차원("20260805")을 사람이 읽는 "8/5"로. */
export function shortDate(key: string): string {
  return `${Number(key.slice(4, 6))}/${Number(key.slice(6, 8))}`;
}
function longDate(key: string): string {
  return `${Number(key.slice(4, 6))}월 ${Number(key.slice(6, 8))}일`;
}

export type Series = { name: string; color: string; values: number[] };

/**
 * 날짜별 추이 선그래프.
 *
 * 자바스크립트 없이 SVG만으로 그린다 — 어드민 한 화면 때문에 차트 라이브러리를 들이면
 * 번들만 무거워진다. 점마다 <title>을 달아두면 브라우저가 알아서 툴팁을 띄워준다.
 */
export function TrendChart({
  title,
  hint,
  labels,
  series,
  empty,
}: {
  title: string;
  hint?: string;
  /** GA4 date 형식(YYYYMMDD) */
  labels: string[];
  series: Series[];
  empty: string;
}) {
  const W = 720;
  const H = 220;
  const PAD = { top: 16, right: 12, bottom: 26, left: 34 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const peak = Math.max(1, ...series.flatMap((s) => s.values));
  // 눈금이 1.3, 2.6 같은 수로 떨어지지 않게 위쪽을 정수로 올려 잡는다.
  const step = Math.max(1, Math.ceil(peak / 4));
  const max = step * 4;

  const x = (i: number) => PAD.left + (labels.length <= 1 ? innerW / 2 : (innerW * i) / (labels.length - 1));
  const y = (v: number) => PAD.top + innerH - (innerH * v) / max;

  // 날짜가 많으면 라벨이 겹친다. 최대 7개만 남기고 솎아낸다.
  const tickEvery = Math.max(1, Math.ceil(labels.length / 7));

  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-line8 bg-panel px-5 py-[18px]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-sm font-bold">{title}</div>
          {hint ? <div className="mt-1 text-[11px] leading-relaxed text-fg40">{hint}</div> : null}
        </div>
        <div className="flex gap-3">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5 text-[11px] text-fg55">
              <span className="h-[3px] w-3.5 rounded-full" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      </div>

      {/*
        폭이 좁으면 그래프를 통째로 줄이는 대신 옆으로 밀어 본다(min-w).
        그냥 줄이면 날짜 글자가 4px까지 작아져 읽을 수가 없다.
      */}
      {labels.length === 0 ? (
        <div className="py-10 text-center text-[13px] text-fg35">{empty}</div>
      ) : (
        <div className="h-scroll">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full min-w-[620px]"
          role="img"
          aria-label={title}
        >
          {[0, 1, 2, 3, 4].map((i) => {
            const value = step * i;
            return (
              <g key={i}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y(value)}
                  y2={y(value)}
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="1"
                />
                <text x={PAD.left - 7} y={y(value) + 3.5} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.32)">
                  {value}
                </text>
              </g>
            );
          })}

          {labels.map((key, i) =>
            i % tickEvery === 0 || i === labels.length - 1 ? (
              <text key={key} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.32)">
                {shortDate(key)}
              </text>
            ) : null,
          )}

          {series.map((s) => (
            <g key={s.name}>
              {/* 첫 계열만 아래를 옅게 채워 눈이 먼저 붙게 한다 */}
              {s === series[0] && labels.length > 1 ? (
                <path
                  d={`M ${x(0)} ${y(s.values[0] ?? 0)} ${s.values
                    .map((v, i) => `L ${x(i)} ${y(v)}`)
                    .join(" ")} L ${x(labels.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`}
                  fill={s.color}
                  opacity="0.12"
                />
              ) : null}
              <path
                d={s.values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ")}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {s.values.map((v, i) => (
                <circle key={`${s.name}-${i}`} cx={x(i)} cy={y(v)} r="3" fill={s.color}>
                  <title>{`${longDate(labels[i])} · ${s.name} ${v}`}</title>
                </circle>
              ))}
            </g>
          ))}
        </svg>
        </div>
      )}
    </section>
  );
}
