"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Toast, useToast } from "@/components/admin/Toast";
import { SpinnerIcon } from "@/components/icons";
import { Markdown } from "@/components/site/Markdown";
import { ApiError, api } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import type { LegalDocumentDTO, LegalVersionDTO } from "@/lib/types";

/** ISO 문자열 → input[type=date] 가 쓰는 YYYY-MM-DD (시행일은 UTC 기준) */
function toDateInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

const HELP = `## 큰 제목
### 작은 제목
- 목록 항목
1. 번호 목록

빈 줄로 문단을 나눕니다. **굵게**, [링크](https://example.com) 도 됩니다.`;

export function LegalManager({ initialDocuments }: { initialDocuments: LegalDocumentDTO[] }) {
  const router = useRouter();
  const [documents, setDocuments] = useState(initialDocuments);
  const [activeSlug, setActiveSlug] = useState(initialDocuments[0]?.slug ?? "");
  const [preview, setPreview] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState<LegalVersionDTO | null>(null);
  const [publishing, setPublishing] = useState<LegalVersionDTO | null>(null);
  const { toast, show } = useToast();

  const doc = documents.find((d) => d.slug === activeSlug) ?? documents[0];
  const published = doc?.versions.find((v) => v.isPublished) ?? null;
  const latest = doc?.versions[0] ?? null;

  // 편집 초안 — 문서를 바꾸면 그 문서의 최신 내용으로 갈아끼운다.
  const [draft, setDraft] = useState(() => ({
    slug: initialDocuments[0]?.slug ?? "",
    body: initialDocuments[0]?.versions[0]?.body ?? "",
    effectiveDate: initialDocuments[0]?.versions[0]
      ? toDateInput(initialDocuments[0].versions[0].effectiveDate)
      : new Date().toISOString().slice(0, 10),
    changeNote: "",
  }));

  const loadInto = (slug: string, source?: LegalVersionDTO | null) => {
    const target = documents.find((d) => d.slug === slug);
    const base = source ?? target?.versions[0] ?? null;
    setActiveSlug(slug);
    setPreview(false);
    setError("");
    setDraft({
      slug,
      body: base?.body ?? "",
      effectiveDate: base ? toDateInput(base.effectiveDate) : new Date().toISOString().slice(0, 10),
      changeNote: "",
    });
  };

  const reload = async () => {
    const data = await api<{ documents: LegalDocumentDTO[] }>("/api/legal");
    setDocuments(data.documents);
    router.refresh(); // 사이트 페이지도 새 내용으로
    return data.documents;
  };

  const save = async (publish: boolean) => {
    if (!doc || pending) return;
    if (!draft.body.trim()) {
      setError("본문을 입력해주세요.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await api(`/api/legal/${doc.slug}`, {
        method: "POST",
        body: JSON.stringify({
          body: draft.body,
          effectiveDate: draft.effectiveDate,
          changeNote: draft.changeNote,
          publish,
        }),
      });
      const next = await reload();
      const updated = next.find((d) => d.slug === doc.slug);
      setDraft((d) => ({ ...d, changeNote: "" }));
      show(
        publish
          ? `새 버전(v${updated?.versions[0]?.version ?? "?"})을 발행했어요. 사이트에 바로 반영됐어요.`
          : "초안으로 저장했어요. 아직 사이트에는 보이지 않아요.",
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "저장하지 못했어요.");
    } finally {
      setPending(false);
    }
  };

  const doPublish = async (version: LegalVersionDTO) => {
    setPublishing(null);
    try {
      await api(`/api/legal/versions/${version.id}`, { method: "PATCH" });
      await reload();
      show(`v${version.version}을 발행했어요.`);
    } catch (e) {
      show(e instanceof ApiError ? e.message : "발행하지 못했어요.", "error");
    }
  };

  if (!doc) {
    return <div className="text-[13px] text-fg55">등록된 문서가 없어요.</div>;
  }

  const isDirty = draft.body !== (latest?.body ?? "");

  return (
    <>
      <h1 className="text-2xl font-extrabold">약관 · 정책 관리</h1>
      <p className="-mt-3 text-[13px] leading-relaxed text-fg55">
        수정하면 새 버전으로 쌓이고, 발행한 버전이 사이트에 바로 나타나요. 지난 버전은 이력으로 남아 이용자도
        열람할 수 있어요.
      </p>

      <div className="flex flex-wrap gap-2">
        {documents.map((d) => (
          <button
            key={d.slug}
            type="button"
            onClick={() => loadInto(d.slug)}
            className={`chip !px-[15px] !py-2 !text-xs ${d.slug === activeSlug ? "chip-on" : "chip-off"}`}
          >
            {d.title}
          </button>
        ))}
        <a
          href={`/${doc.slug}`}
          target="_blank"
          rel="noreferrer noopener"
          className="chip chip-off !px-[15px] !py-2 !text-xs"
        >
          사이트에서 보기 ↗
        </a>
      </div>

      <section className="flex flex-col gap-4 rounded-[14px] border border-line8 bg-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-bold">
            {doc.title} 편집
            {published ? (
              <span className="ml-2 text-xs font-normal text-fg40">
                현재 발행중 · v{published.version}
              </span>
            ) : (
              <span className="ml-2 text-xs font-normal text-danger">발행된 버전 없음</span>
            )}
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-3 py-1.5 text-xs text-fg70"
            >
              작성법
            </button>
            <button
              type="button"
              onClick={() => setPreview((v) => !v)}
              className={`chip !px-3 !py-1.5 !text-xs ${preview ? "chip-on" : "chip-off"}`}
            >
              {preview ? "편집으로" : "미리보기"}
            </button>
          </div>
        </div>

        {showHelp ? (
          <pre className="overflow-x-auto rounded-[10px] border border-line8 bg-card p-3.5 text-[12px] leading-relaxed text-fg60">
            {HELP}
          </pre>
        ) : null}

        {preview ? (
          <div className="rounded-[10px] border border-line8 bg-card p-5">
            <Markdown body={draft.body} />
          </div>
        ) : (
          <textarea
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
            spellCheck={false}
            className="field min-h-[420px] resize-y p-4 font-mono text-[13px] leading-[1.7]"
          />
        )}

        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          <label className="flex flex-col gap-[7px]">
            <span className="text-xs font-semibold text-fg70">시행일</span>
            <input
              type="date"
              value={draft.effectiveDate}
              onChange={(e) => setDraft((d) => ({ ...d, effectiveDate: e.target.value }))}
              className="field h-[42px] px-[13px] text-[13px]"
            />
          </label>
          <label className="flex flex-col gap-[7px]">
            <span className="text-xs font-semibold text-fg70">변경 요약 (이력에 표시돼요)</span>
            <input
              value={draft.changeNote}
              onChange={(e) => setDraft((d) => ({ ...d, changeNote: e.target.value }))}
              placeholder="예: 광고 쿠키 관련 항목 추가"
              className="field h-[42px] px-[13px] text-[13px]"
            />
          </label>
        </div>

        {error ? <div className="text-[13px] text-danger">{error}</div> : null}

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => save(true)}
            disabled={pending}
            className="btn-grad h-[42px] px-[18px] text-[13px]"
          >
            {pending ? <SpinnerIcon /> : "새 버전으로 저장하고 발행"}
          </button>
          <button
            type="button"
            onClick={() => save(false)}
            disabled={pending}
            className="btn-ghost h-[42px] px-4 text-[13px]"
          >
            초안으로만 저장
          </button>
          {isDirty ? <span className="text-xs text-fg40">저장하지 않은 변경이 있어요</span> : null}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-[14px] border border-line8 bg-panel p-5">
        <div className="text-sm font-bold">버전 이력</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[13px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold text-fg40">
                <th className="border-b border-line8 py-2 pr-3">버전</th>
                <th className="border-b border-line8 py-2 pr-3">시행일</th>
                <th className="border-b border-line8 py-2 pr-3">변경 요약</th>
                <th className="border-b border-line8 py-2 pr-3">작성</th>
                <th className="border-b border-line8 py-2 pr-3">상태</th>
                <th className="border-b border-line8 py-2">관리</th>
              </tr>
            </thead>
            <tbody>
              {doc.versions.map((v) => (
                <tr key={v.id}>
                  <td className="border-b border-line4 py-2.5 pr-3 font-semibold text-fg70">v{v.version}</td>
                  <td className="border-b border-line4 py-2.5 pr-3 text-fg55">
                    {toDateInput(v.effectiveDate)}
                  </td>
                  <td className="border-b border-line4 py-2.5 pr-3 text-fg55">{v.changeNote || "—"}</td>
                  <td className="border-b border-line4 py-2.5 pr-3 text-xs text-fg40">
                    {v.createdByName}
                    <br />
                    {formatDateTime(v.createdAt)}
                  </td>
                  <td className="border-b border-line4 py-2.5 pr-3">
                    {v.isPublished ? (
                      <span className="rounded-pill bg-accent-soft px-2 py-[2px] text-[10px] font-bold text-accent">
                        발행중
                      </span>
                    ) : v.publishedAt ? (
                      <span className="rounded-pill bg-surface6 px-2 py-[2px] text-[10px] text-fg40">
                        지난 버전
                      </span>
                    ) : (
                      <span className="rounded-pill bg-danger-soft px-2 py-[2px] text-[10px] font-bold text-danger">
                        초안
                      </span>
                    )}
                  </td>
                  <td className="border-b border-line4 py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setViewing(v)}
                        className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-2.5 py-1 text-xs text-fg"
                      >
                        보기
                      </button>
                      <button
                        type="button"
                        onClick={() => loadInto(doc.slug, v)}
                        className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-2.5 py-1 text-xs text-fg"
                      >
                        이 내용 불러오기
                      </button>
                      {!v.isPublished ? (
                        <button
                          type="button"
                          onClick={() => setPublishing(v)}
                          className="cursor-pointer rounded-lg border border-accent-line bg-accent-soft8 px-2.5 py-1 text-xs text-accent"
                        >
                          발행
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {viewing ? (
        <div
          className="fixed inset-0 z-110 flex items-center justify-center bg-[rgba(0,0,0,0.6)] p-4 md:p-10"
          onClick={() => setViewing(null)}
          role="presentation"
        >
          <div
            className="flex max-h-[88vh] w-full max-w-[720px] flex-col gap-4 overflow-y-auto rounded-[18px] border border-line10 bg-modal p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-base font-bold">
                {doc.title} v{viewing.version}
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="cursor-pointer text-sm text-fg55"
              >
                닫기
              </button>
            </div>
            <Markdown body={viewing.body} />
          </div>
        </div>
      ) : null}

      {publishing ? (
        <ConfirmDialog
          title={`v${publishing.version}을 발행할까요?`}
          description="사이트에 이 버전이 즉시 노출되고, 지금 발행중인 버전은 지난 버전으로 내려가요."
          confirmLabel="발행"
          danger={false}
          onConfirm={() => doPublish(publishing)}
          onCancel={() => setPublishing(null)}
        />
      ) : null}

      <Toast toast={toast} />
    </>
  );
}
