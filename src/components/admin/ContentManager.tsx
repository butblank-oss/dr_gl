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
import type { ContentDTO } from "@/lib/types";

const GRID = "grid grid-cols-[48px_minmax(0,1fr)_90px_110px_64px_120px] items-center gap-3 px-[18px]";

const THUMB_EMPTY = (
  <div className="absolute inset-0 flex items-center justify-center text-[10px] text-fg30">포스터</div>
);

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
  const [draft, setDraft] = useState<ContentDraft | null>(null);
  const [deleting, setDeleting] = useState<ContentDTO | null>(null);
  const { toast, show } = useToast();

  const reload = async () => {
    const data = await api<{ items: ContentDTO[] }>("/api/content");
    setItems(data.items);
  };

  const filtered = useMemo(() => {
    const q = search.trim();
    return items
      .filter((item) => filter === "전체" || item.category === filter)
      .filter((item) => !q || item.title.includes(q))
      .filter((item) => !juiceOnly || item.juice);
  }, [items, search, filter, juiceOnly]);

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

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="제목으로 검색"
        className="field h-[38px] w-[220px] rounded-[9px] px-3.5 text-[13px]"
      />

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
          <div>제목</div>
          <div>카테고리</div>
          <div>국가·연도</div>
          <div>착즙</div>
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
            <div className="text-xs text-fg55">{item.category}</div>
            <div className="text-xs text-fg55">
              {item.countryDetail} · {item.year}
            </div>
            <div>
              {item.juice ? <span className="badge-juice px-2 py-[3px] text-[10px]">착즙</span> : null}
            </div>
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
