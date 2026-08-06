"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Toast, useToast } from "@/components/admin/Toast";
import { ApiError, api } from "@/lib/client-api";
import type { CategoryDTO } from "@/lib/types";

export function CategoryManager({ initialCategories }: { initialCategories: CategoryDTO[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [renameTarget, setRenameTarget] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<CategoryDTO | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const { toast, show } = useToast();

  const reload = async () => {
    const data = await api<{ categories: CategoryDTO[] }>("/api/categories");
    setCategories(data.categories);
  };

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    setError("");
    try {
      await api("/api/categories", { method: "POST", body: JSON.stringify({ name }) });
      setNewName("");
      await reload();
      show(`"${name}" 카테고리를 추가했어요.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "카테고리를 추가하지 못했어요.");
    }
  };

  const confirmRename = async (category: CategoryDTO) => {
    const name = renameValue.trim();
    if (!name) return;
    setError("");
    try {
      await api(`/api/categories/${category.id}`, { method: "PATCH", body: JSON.stringify({ name }) });
      setRenameTarget(null);
      setRenameValue("");
      await reload();
      show(`카테고리 이름을 "${name}"(으)로 바꿨어요. 연관 콘텐츠도 함께 갱신됐어요.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "이름을 바꾸지 못했어요.");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    setError("");
    try {
      await api(`/api/categories/${target.id}`, { method: "DELETE" });
      await reload();
      show(`"${target.name}" 카테고리를 삭제했어요.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "카테고리를 삭제하지 못했어요.");
    }
  };

  /**
   * 순서를 옮긴다. 화면을 먼저 바꾸고 서버에 보낸다 —
   * 드래그를 놓는 순간 제자리로 튕겼다가 돌아오면 실수한 줄 알게 된다.
   */
  const reorder = async (from: number, to: number) => {
    if (from === to) return;
    const next = [...categories];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);

    const before = categories;
    setCategories(next);
    setError("");
    try {
      const data = await api<{ categories: CategoryDTO[] }>("/api/categories/order", {
        method: "PUT",
        body: JSON.stringify({ ids: next.map((c) => c.id) }),
      });
      setCategories(data.categories);
      show(`순서를 바꿨어요. 사이트에도 이 순서로 보여요.`);
    } catch (e) {
      setCategories(before);
      setError(e instanceof ApiError ? e.message : "순서를 바꾸지 못했어요.");
    }
  };

  const requestDelete = (category: CategoryDTO) => {
    // 사용 중인 카테고리는 서버에서도 막지만, 화면에서 먼저 이유를 알려준다.
    if ((category.count ?? 0) > 0) {
      setError(`"${category.name}" 카테고리를 사용하는 콘텐츠가 ${category.count}개 있어 삭제할 수 없어요.`);
      return;
    }
    setError("");
    setDeleting(category);
  };

  return (
    <>
      <h1 className="text-2xl font-extrabold">카테고리 관리</h1>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="새 카테고리 이름"
          className="field h-[42px] w-[240px] px-3.5 text-[13px]"
        />
        <button type="button" onClick={add} className="btn-grad h-[42px] px-[18px] text-[13px]">
          + 추가
        </button>
      </div>

      <div className="rounded-[10px] border border-[rgba(155,126,232,0.18)] bg-accent-soft8 px-4 py-3 text-xs leading-relaxed text-fg65">
        <strong className="text-fg80">여기 순서가 사이트 순서예요.</strong> 행을 위아래로 끌어
        놓거나 ↑↓ 버튼으로 옮기면, 사이트의 카테고리 탭과 제보 폼의 형식 목록이 같은 순서로 바뀝니다.
        <br />
        참고: &quot;착즙&quot;은 카테고리가 아니라 콘텐츠별 태그예요. 콘텐츠 관리의 추가·수정 화면에서 &quot;착즙
        작품&quot; 토글로 켜고 끌 수 있어요. 여기에는 형식(영화·드라마·웹툰 등)만 추가하세요.
      </div>

      {error ? <div className="text-[13px] text-danger">{error}</div> : null}

      <div className="overflow-hidden rounded-[14px] border border-line8 bg-panel">
        {categories.map((category, index) => {
          const isRenaming = renameTarget === category.id;
          const isDragging = drag === index;
          const isOver = dragOver === index && !isDragging;
          return (
            <div
              key={category.id}
              // 이름을 고치는 중에는 드래그를 막는다. 글자를 끌면 행이 통째로 끌려간다.
              draggable={!isRenaming}
              onDragStart={(e) => {
                setDrag(index);
                e.dataTransfer.effectAllowed = "move";
                // 파이어폭스는 데이터가 있어야 드래그가 시작된다
                e.dataTransfer.setData("text/plain", String(category.id));
              }}
              onDragEnd={() => {
                setDrag(null);
                setDragOver(null);
              }}
              onDragOver={(e) => {
                if (drag === null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOver(index);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const from = drag;
                setDrag(null);
                setDragOver(null);
                if (from !== null) reorder(from, index);
              }}
              className={`flex items-center justify-between border-b border-line6 px-[18px] py-3.5 transition-colors ${
                isDragging ? "opacity-45" : isOver ? "bg-accent-soft8" : ""
              } ${isRenaming ? "" : "cursor-grab active:cursor-grabbing"}`}
            >
              {isRenaming ? (
                <input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmRename(category);
                  }}
                  autoFocus
                  className="h-9 w-[200px] rounded-lg border border-[rgba(155,126,232,0.4)] bg-card px-3 text-[13px] text-fg outline-none"
                />
              ) : (
                <div className="flex items-center gap-2.5">
                  <span className="select-none text-fg30" aria-hidden>
                    ⠿
                  </span>
                  <span className="text-xs text-fg30">{index + 1}</span>
                  <span className="text-sm font-bold">{category.name}</span>
                  <span className="text-xs text-fg40">콘텐츠 {category.count ?? 0}개</span>
                </div>
              )}

              {isRenaming ? (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => confirmRename(category)}
                    className="btn-grad px-3 py-1.5 text-xs"
                  >
                    확인
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenameTarget(null);
                      setRenameValue("");
                    }}
                    className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-3 py-1.5 text-xs text-fg"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  {/* 손가락으로는 드래그가 안 먹는 기기가 있어서 버튼도 같이 둔다 */}
                  <button
                    type="button"
                    onClick={() => reorder(index, index - 1)}
                    disabled={index === 0}
                    aria-label={`${category.name} 위로`}
                    className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-2.5 py-1.5 text-xs text-fg disabled:opacity-35"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => reorder(index, index + 1)}
                    disabled={index === categories.length - 1}
                    aria-label={`${category.name} 아래로`}
                    className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-2.5 py-1.5 text-xs text-fg disabled:opacity-35"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenameTarget(category.id);
                      setRenameValue(category.name);
                      setError("");
                    }}
                    className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-3 py-1.5 text-xs text-fg"
                  >
                    이름변경
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDelete(category)}
                    className="btn-danger px-3 py-1.5 text-xs"
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {categories.length === 0 ? (
          <div className="py-15 text-center text-[13px] text-fg35">등록된 카테고리가 없어요.</div>
        ) : null}
      </div>

      {deleting ? (
        <ConfirmDialog
          title={`"${deleting.name}" 카테고리를 삭제할까요?`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      ) : null}

      <Toast toast={toast} />
    </>
  );
}
