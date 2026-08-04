"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Toast, useToast } from "@/components/admin/Toast";
import { ApiError, api } from "@/lib/client-api";
import type { ContentDTO, HomeRowDTO } from "@/lib/types";

type Props = {
  initialRows: HomeRowDTO[];
  allContents: ContentDTO[];
  featuredId: number | null;
};

/** 홈 화면 큐레이션 — 히어로 배너 1개 + 가로 스크롤 행 구성 */
export function HomeRowManager({ initialRows, allContents, featuredId }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [featured, setFeatured] = useState(featuredId ?? allContents[0]?.id ?? null);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");
  const [picker, setPicker] = useState<{ rowId: number; query: string } | null>(null);
  const [deleting, setDeleting] = useState<HomeRowDTO | null>(null);
  const { toast, show } = useToast();

  const reload = async () => {
    const data = await api<{ rows: HomeRowDTO[] }>("/api/home-rows");
    setRows(data.rows);
  };

  const run = async (fn: () => Promise<unknown>, okMessage: string) => {
    setError("");
    try {
      await fn();
      await reload();
      show(okMessage);
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "요청을 처리하지 못했어요.";
      setError(message);
      show(message, "error");
    }
  };

  const saveFeatured = (contentId: number) => {
    setFeatured(contentId);
    run(
      () => api("/api/settings/featured", { method: "PUT", body: JSON.stringify({ contentId }) }),
      "히어로 배너 콘텐츠를 바꿨어요.",
    );
  };

  const addRow = () => {
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    run(() => api("/api/home-rows", { method: "POST", body: JSON.stringify({ title }) }), `"${title}" 행을 추가했어요.`);
  };

  const patchRow = (rowId: number, body: Record<string, unknown>, message: string) =>
    run(() => api(`/api/home-rows/${rowId}`, { method: "PATCH", body: JSON.stringify(body) }), message);

  const moveRow = (index: number, direction: -1 | 1) => {
    const target = rows[index + direction];
    const current = rows[index];
    if (!target || !current) return;
    run(async () => {
      await api(`/api/home-rows/${current.id}`, {
        method: "PATCH",
        body: JSON.stringify({ sortOrder: target.sortOrder }),
      });
      await api(`/api/home-rows/${target.id}`, {
        method: "PATCH",
        body: JSON.stringify({ sortOrder: current.sortOrder }),
      });
    }, "행 순서를 바꿨어요.");
  };

  const setRowContents = (row: HomeRowDTO, contentIds: number[], message: string) =>
    patchRow(row.id, { contentIds }, message);

  return (
    <>
      <h1 className="text-2xl font-extrabold">홈 큐레이션</h1>
      <p className="-mt-4 text-[13px] text-fg55">
        홈의 히어로 배너와 가로 스크롤 행을 여기서 구성해요. 저장하면 사이트 홈에 바로 반영돼요.
      </p>

      <section className="flex flex-col gap-3 rounded-[14px] border border-line8 bg-panel px-5 py-[18px]">
        <div className="text-sm font-bold">히어로 배너 (추천 콘텐츠 1개)</div>
        <select
          value={featured ?? ""}
          onChange={(e) => saveFeatured(Number(e.target.value))}
          className="field h-[42px] w-full max-w-[420px] px-[13px] text-[13px]"
        >
          {allContents.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title} ({item.category} · {item.year})
            </option>
          ))}
        </select>
      </section>

      <div className="flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addRow();
          }}
          placeholder="새 행 제목 (예: 이번 주 추천)"
          className="field h-[42px] w-[280px] px-3.5 text-[13px]"
        />
        <button type="button" onClick={addRow} className="btn-grad h-[42px] px-[18px] text-[13px]">
          + 행 추가
        </button>
      </div>

      {error ? <div className="text-[13px] text-danger">{error}</div> : null}

      <div className="flex flex-col gap-4">
        {rows.map((row, index) => (
          <section key={row.id} className="flex flex-col gap-3 rounded-[14px] border border-line8 bg-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <input
                value={row.title}
                onChange={(e) =>
                  setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, title: e.target.value } : r)))
                }
                onBlur={(e) => {
                  const title = e.target.value.trim();
                  if (title && title !== initialRows.find((r) => r.id === row.id)?.title) {
                    patchRow(row.id, { title }, "행 제목을 저장했어요.");
                  }
                }}
                className="field h-[38px] w-[280px] px-3 text-[13px] font-bold"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => patchRow(row.id, { isActive: !row.isActive }, "행 노출 상태를 바꿨어요.")}
                  className={`chip !px-3 !py-1.5 !text-xs ${row.isActive ? "chip-on" : "chip-off"}`}
                >
                  {row.isActive ? "노출중" : "숨김"}
                </button>
                <button
                  type="button"
                  onClick={() => moveRow(index, -1)}
                  disabled={index === 0}
                  className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-2.5 py-1.5 text-xs text-fg disabled:opacity-35"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveRow(index, 1)}
                  disabled={index === rows.length - 1}
                  className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-2.5 py-1.5 text-xs text-fg disabled:opacity-35"
                >
                  ↓
                </button>
                <button type="button" onClick={() => setDeleting(row)} className="btn-danger px-3 py-1.5 text-xs">
                  행 삭제
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {row.items.map((item, itemIndex) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-pill border border-line12 bg-surface4 py-1.5 pl-3 pr-2 text-xs text-fg70"
                >
                  <span>{item.title}</span>
                  <button
                    type="button"
                    aria-label="앞으로 이동"
                    disabled={itemIndex === 0}
                    onClick={() => {
                      const ids = row.items.map((i) => i.id);
                      [ids[itemIndex - 1]!, ids[itemIndex]!] = [ids[itemIndex]!, ids[itemIndex - 1]!];
                      setRowContents(row, ids, "행 구성을 저장했어요.");
                    }}
                    className="cursor-pointer text-fg40 disabled:opacity-30"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label="뒤로 이동"
                    disabled={itemIndex === row.items.length - 1}
                    onClick={() => {
                      const ids = row.items.map((i) => i.id);
                      [ids[itemIndex]!, ids[itemIndex + 1]!] = [ids[itemIndex + 1]!, ids[itemIndex]!];
                      setRowContents(row, ids, "행 구성을 저장했어요.");
                    }}
                    className="cursor-pointer text-fg40 disabled:opacity-30"
                  >
                    ›
                  </button>
                  <button
                    type="button"
                    aria-label="행에서 제거"
                    onClick={() =>
                      setRowContents(
                        row,
                        row.items.filter((i) => i.id !== item.id).map((i) => i.id),
                        "행 구성을 저장했어요.",
                      )
                    }
                    className="cursor-pointer text-danger"
                  >
                    ×
                  </button>
                </div>
              ))}
              {row.items.length === 0 ? (
                <span className="text-xs text-fg35">아직 담긴 콘텐츠가 없어요. 행이 비어 있으면 홈에서 숨겨져요.</span>
              ) : null}
            </div>

            {picker?.rowId === row.id ? (
              <div className="flex flex-col gap-2 rounded-[10px] border border-line8 bg-card p-3">
                <input
                  value={picker.query}
                  onChange={(e) => setPicker({ rowId: row.id, query: e.target.value })}
                  placeholder="제목으로 콘텐츠 찾기"
                  autoFocus
                  className="field h-9 px-3 text-[13px]"
                />
                <div className="flex max-h-[180px] flex-wrap gap-1.5 overflow-y-auto">
                  {allContents
                    .filter((item) => !row.items.some((i) => i.id === item.id))
                    .filter((item) => !picker.query.trim() || item.title.includes(picker.query.trim()))
                    .slice(0, 40)
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setPicker(null);
                          setRowContents(row, [...row.items.map((i) => i.id), item.id], "행에 콘텐츠를 담았어요.");
                        }}
                        className="cursor-pointer rounded-pill border border-line12 bg-surface4 px-3 py-1.5 text-xs text-fg70"
                      >
                        + {item.title}
                      </button>
                    ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPicker(null)}
                  className="w-fit cursor-pointer text-xs text-fg40"
                >
                  닫기
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPicker({ rowId: row.id, query: "" })}
                className="w-fit cursor-pointer rounded-lg border border-dashed border-line20 px-3.5 py-[7px] text-xs text-fg60"
              >
                + 콘텐츠 담기
              </button>
            )}
          </section>
        ))}

        {rows.length === 0 ? (
          <div className="rounded-[14px] border border-line8 bg-panel py-15 text-center text-[13px] text-fg35">
            아직 만든 행이 없어요.
          </div>
        ) : null}
      </div>

      {deleting ? (
        <ConfirmDialog
          title={`"${deleting.title}" 행을 삭제할까요?`}
          description="행만 삭제되고 콘텐츠 자체는 남아 있어요."
          onConfirm={() => {
            const target = deleting;
            setDeleting(null);
            run(() => api(`/api/home-rows/${target.id}`, { method: "DELETE" }), "행을 삭제했어요.");
          }}
          onCancel={() => setDeleting(null)}
        />
      ) : null}

      <Toast toast={toast} />
    </>
  );
}
