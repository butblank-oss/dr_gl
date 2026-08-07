"use client";

import { useState } from "react";
import { ApiError, api } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import {
  DRAFT_FIELDS,
  EMPTY_DRAFT,
  buildResearchPrompt,
  hasDraftContent,
  parseResearchOutput,
  toDraft,
  type ResearchDraft,
} from "@/lib/research";
import type { SubmissionDTO } from "@/lib/types";

/**
 * 제보 옆에 붙는 조사 초안 패널.
 *
 * 제보로 들어오는 건 대개 제목 하나다. 나머지를 매번 손으로 찾아 채우던 일을,
 * 프롬프트 복사 → 결과 붙여넣기 → 항목별로 나뉜 초안, 이 세 단계로 줄인다.
 * 초안은 제보에 저장돼 있어서 나중에 다시 열어도 그대로 남아 있다.
 */
export function ResearchPanel({
  submission,
  onSaved,
  onUseDraft,
}: {
  submission: SubmissionDTO;
  onSaved: (message: string) => void;
  onUseDraft: (draft: ResearchDraft) => void;
}) {
  const saved = toDraft(submission.research);
  const [draft, setDraft] = useState<ResearchDraft>(saved);
  const [paste, setPaste] = useState("");
  const [open, setOpen] = useState(hasDraftContent(saved));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const prompt = buildResearchPrompt({
    title: submission.title,
    category: submission.category,
    country: submission.country,
    platform: submission.platform,
    url: submission.url,
    note: submission.note,
  });

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드가 막힌 환경에서는 직접 복사할 수 있게 그대로 띄운다.
      window.prompt("아래 프롬프트를 복사해 사용하세요", prompt);
    }
  };

  const applyPaste = () => {
    const parsed = parseResearchOutput(paste);
    if (!hasDraftContent(parsed)) {
      setError("붙여넣은 내용에서 알아볼 수 있는 항목이 없어요. 템플릿 형식 그대로 붙여넣어 주세요.");
      return;
    }
    setError("");
    // 이미 손으로 채워 둔 값은 지우지 않는다 — 새로 읽어낸 값만 덮는다.
    setDraft((current) => {
      const next = { ...current };
      for (const key of Object.keys(EMPTY_DRAFT) as (keyof ResearchDraft)[]) {
        if (parsed[key].trim()) next[key] = parsed[key];
      }
      return next;
    });
    setPaste("");
  };

  const save = async () => {
    setPending(true);
    setError("");
    try {
      await api(`/api/submissions/${submission.id}/research`, {
        method: "PUT",
        body: JSON.stringify(draft),
      });
      onSaved("조사 초안을 저장했어요.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "저장하지 못했어요.");
    } finally {
      setPending(false);
    }
  };

  const clear = async () => {
    setPending(true);
    try {
      await api(`/api/submissions/${submission.id}/research`, { method: "DELETE" });
      setDraft({ ...EMPTY_DRAFT });
      onSaved("조사 초안을 비웠어요.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "비우지 못했어요.");
    } finally {
      setPending(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-lg border border-line12 bg-surface4 px-3.5 py-2 text-xs font-semibold text-fg"
      >
        조사 초안 채우기
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-accent-line bg-accent-soft8 px-3.5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-bold text-accent">
          조사 초안
          {submission.researchedAt ? (
            <span className="ml-2 font-normal text-fg40">
              {formatDateTime(submission.researchedAt)} 저장됨
            </span>
          ) : null}
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={copyPrompt}
            className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-3 py-1.5 text-[11px] font-semibold text-fg"
          >
            {copied ? "복사했어요" : "① 조사 프롬프트 복사"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-3 py-1.5 text-[11px] text-fg55"
          >
            접기
          </button>
        </div>
      </div>

      <div className="text-[11px] leading-relaxed text-fg50">
        ① 프롬프트를 복사해 클로드에 붙여넣고 ② 나온 결과를 아래 칸에 그대로 붙여넣으면
        항목별로 나뉩니다. ③ 확인·수정한 뒤 저장하면 &quot;검토 · 발행&quot;을 열 때 미리 채워져요.
      </div>

      <div className="flex flex-col gap-2">
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={3}
          placeholder="② 조사 결과를 여기에 붙여넣으세요 (제목 : … / 카테고리 : … 형식)"
          className="w-full resize-y rounded-lg border border-line12 bg-surface4 px-3 py-2 text-xs text-fg placeholder:text-fg30"
        />
        <button
          type="button"
          onClick={applyPaste}
          disabled={!paste.trim()}
          className="self-start cursor-pointer rounded-lg border border-line12 bg-surface4 px-3 py-1.5 text-[11px] font-semibold text-fg disabled:opacity-40"
        >
          붙여넣은 내용 항목별로 나누기
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {DRAFT_FIELDS.map((field) => (
          <label key={field.key} className={`flex flex-col gap-1 ${field.multiline ? "lg:col-span-2" : ""}`}>
            <span className="text-[11px] font-semibold text-fg60">
              {field.label}
              {field.hint ? <span className="ml-1.5 font-normal text-fg30">{field.hint}</span> : null}
            </span>
            {field.multiline ? (
              <textarea
                value={draft[field.key]}
                onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                rows={3}
                className="w-full resize-y rounded-lg border border-line12 bg-card px-3 py-2 text-xs text-fg"
              />
            ) : (
              <input
                value={draft[field.key]}
                onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                className="h-9 w-full rounded-lg border border-line12 bg-card px-3 text-xs text-fg"
              />
            )}
          </label>
        ))}
      </div>

      {draft.posterUrl.trim() ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={draft.posterUrl.trim()}
            alt="포스터 미리보기"
            className="h-[120px] w-20 rounded-lg object-cover"
          />
          <span className="text-[11px] text-fg40">
            포스터가 안 보이면 주소가 이미지 파일이 아니거나 외부 접근이 막힌 곳이에요.
          </span>
        </div>
      ) : null}

      {error ? <div className="text-[11px] text-danger">{error}</div> : null}

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="btn-grad px-3.5 py-2 text-[11px] disabled:opacity-50"
        >
          ③ 초안 저장
        </button>
        <button
          type="button"
          onClick={() => onUseDraft(draft)}
          disabled={!hasDraftContent(draft)}
          className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-3.5 py-2 text-[11px] font-semibold text-fg disabled:opacity-40"
        >
          이 초안으로 검토 · 발행 열기
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={pending}
          className="cursor-pointer rounded-lg border border-danger-line bg-danger-soft8 px-3.5 py-2 text-[11px] text-danger disabled:opacity-50"
        >
          초안 비우기
        </button>
      </div>
    </div>
  );
}
