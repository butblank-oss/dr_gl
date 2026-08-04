"use client";

import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  ContentModal,
  makeAddDraft,
  makeEditDraft,
  type ContentDraft,
} from "@/components/admin/ContentModal";
import { Toast, useToast } from "@/components/admin/Toast";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { ApiError, api } from "@/lib/client-api";
import { formatDate } from "@/lib/format";
import type { ContentDTO } from "@/lib/types";

const GRID =
  "grid grid-cols-[40px_minmax(0,1fr)_110px] items-center gap-3 px-3 md:grid-cols-[48px_minmax(0,1fr)_96px_120px_64px_92px_120px] md:px-[18px]";
// 좁은 화면에서는 부가 열을 숨긴다
const HIDE_SM = "hidden md:block";

const THUMB_EMPTY = (
  <div className="absolute inset-0 flex items-center justify-center text-[10px] text-fg30">포스터</div>
);

type SortKey = "createdAt" | "title" | "category" | "year" | "juice";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "title", label: "제목" },
  { key: "category", label: "카테고리", className: HIDE_SM },
  { key: "year", label: "국가·연도", className: HIDE_SM },
  { key: "juice", label: "착즙", className: HIDE_SM },
  { key: "createdAt", label: "등록일", className: HIDE_SM },
];

export function ContentManager({
  initialItems,
  categories,
}: {
  initialItems: ContentDTO[];
  categories: string[];
}) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("전체");
  const [juiceOnly, setJuiceOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [draft, setDraft] = useState<ContentDraft | null>(null);
  const [deleting, setDeleting] = useState<ContentDTO | null>(null);
  const { toast, show } = useToast();

  const reload = async () => {
    const data = await api<{ items: ContentDTO[] }>("/api/content");
    setItems(data.items);
  };

  /** 같은 열을 다시 누르면 오름/내림이 뒤집힌다. */
  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // 최신순이 기본으로 유용한 열만 내림차순으로 시작한다.
      setSortDir(key === "createdAt" || key === "year" || key === "juice" ? "desc" : "asc");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = items
      .filter((item) => filter === "전체" || item.category === filter)
      .filter((item) => {
        if (!q) return true;
        // 제목뿐 아니라 제작자·출연·태그까지 훑어서 운영 중에 찾기 쉽게 한다.
        const haystack = [
          item.title,
          item.creatorName,
          item.category,
          item.countryDetail,
          ...item.leads,
          ...item.tags,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .filter((item) => !juiceOnly || item.juice);

    const dir = sortDir === "asc" ? 1 : -1;
    return [...matched].sort((a, b) => {
      switch (sortKey) {
        case "title":
          return a.title.localeCompare(b.title, "ko") * dir;
        case "category":
          return (a.category.localeCompare(b.category, "ko") || a.title.localeCompare(b.title, "ko")) * dir;
        case "year":
          return ((a.year - b.year) || a.title.localeCompare(b.title, "ko")) * dir;
        case "juice":
          return ((Number(a.juice) - Number(b.juice)) || a.title.localeCompare(b.title, "ko")) * dir;
        default:
          return (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id - b.id) * dir;
      }
    });
  }, [items, search, filter, juiceOnly, sortKey, sortDir]);

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    try {
      await api(`/api/content/${target.id}`, { method: "DELETE" });
      await reload();
      show(`"${target.title}" 콘텐츠를 삭제했어요.`);
    } catch (e) {
      show(e instanceof ApiError ? e.message : "삭제하지 못했어요.", "error");
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">콘텐츠 관리</h1>
        <button
          type="button"
          onClick={() => setDraft(makeAddDraft(categories))}
          className="btn-grad h-[42px] px-[18px] text-[13px]"
        >
          + 콘텐츠 추가
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="제목 · 제작자 · 출연 · 태그로 검색"
          className="field h-[38px] w-full rounded-[9px] px-3.5 text-[13px] sm:w-[280px]"
        />
        <span className="text-xs text-fg40">
          {filtered.length}개 / 전체 {items.length}개
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {["전체", ...categories].map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setFilter(name)}
            className={`chip !px-[15px] !py-2 !text-xs ${filter === name ? "chip-on" : "chip-off"}`}
          >
            {name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setJuiceOnly((v) => !v)}
          className={`chip !px-[15px] !py-2 !text-xs ${juiceOnly ? "chip-juice-on" : "chip-off"}`}
        >
          착즙만 보기
        </button>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-line8 bg-panel">
        <div className={`${GRID} border-b border-line6 py-2.5 text-[11px] font-semibold text-fg40`}>
          <div />
          {COLUMNS.map((col) => (
            <button
              key={col.key}
              type="button"
              onClick={() => toggleSort(col.key)}
              title={`${col.label} 기준으로 정렬`}
              className={`flex cursor-pointer items-center gap-1 text-left hover:text-fg70 ${col.className ?? ""} ${
                sortKey === col.key ? "text-accent" : ""
              }`}
            >
              {col.label}
              <span className={sortKey === col.key ? "" : "opacity-25"}>
                {sortKey === col.key ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
              </span>
            </button>
          ))}
          <div>관리</div>
        </div>

        {filtered.map((item) => (
          <div key={item.id} className={`${GRID} border-b border-line4 py-2.5 hover:bg-surface3`}>
            <div className="relative h-[38px] w-[38px] flex-none overflow-hidden rounded-lg bg-tile">
              {item.poster ? (
                item.posterUrl ? (
                  <ImageWithFallback
                    src={item.posterUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    fallback={THUMB_EMPTY}
                  />
                ) : (
                  THUMB_EMPTY
                )
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-fg30">-</div>
              )}
            </div>
            <div className="truncate text-[13px] font-semibold">{item.title}</div>
            <div className={`text-xs text-fg55 ${HIDE_SM}`}>{item.category}</div>
            <div className={`text-xs text-fg55 ${HIDE_SM}`}>
              {item.countryDetail} · {item.year}
            </div>
            <div className={HIDE_SM}>
              {item.juice ? <span className="badge-juice px-2 py-[3px] text-[10px]">착즙</span> : null}
            </div>
            <div className={`text-xs text-fg40 ${HIDE_SM}`}>{formatDate(item.createdAt)}</div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setDraft(makeEditDraft(item))}
                className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-[11px] py-1.5 text-xs text-fg"
              >
                수정
              </button>
              <button
                type="button"
                onClick={() => setDeleting(item)}
                className="btn-danger px-[11px] py-1.5 text-xs"
              >
                삭제
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 ? (
          <div className="py-15 text-center text-[13px] text-fg35">조건에 맞는 콘텐츠가 없어요.</div>
        ) : null}
      </div>

      {draft ? (
        <ContentModal
          draft={draft}
          categories={categories}
          onClose={() => setDraft(null)}
          onSaved={async () => {
            setDraft(null);
            await reload();
            show("콘텐츠를 저장했어요. 사이트에 바로 반영됐어요.");
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="이 콘텐츠를 삭제할까요?"
          description={`"${deleting.title}" 콘텐츠와 여기에 달린 한줄평이 함께 삭제돼요. 되돌릴 수 없어요.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      ) : null}

      <Toast toast={toast} />
    </>
  );
}
