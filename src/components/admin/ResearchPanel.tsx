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
  autoEnabled,
  onSaved,
  onUseDraft,
}: {
  submission: SubmissionDTO;
  /** 서버에 조사용 키가 들어 있는지. 꺼져 있으면 손으로 채우는 길만 보여준다. */
  autoEnabled: boolean;
  onSaved: (message: string) => void;
  onUseDraft: (draft: ResearchDraft) => void;
}) {
  const saved = toDraft(submission.research);
  const [draft, setDraft] = useState<ResearchDraft>(saved);
  const [paste, setPaste] = useState("");
  const [open, setOpen] = useState(hasDraftContent(saved));
  // 값이 하나라도 있을 때만 17개 칸을 편다. 빈 칸만 잔뜩 있으면 뭘 하라는 건지 알 수 없다.
  const [showFields, setShowFields] = useState(hasDraftContent(saved));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [researching, setResearching] = useState(false);

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
    setShowFields(true);
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

  /** 서버에서 지금 다시 조사한다. 자동으로 채워진 값이 어긋났을 때 쓰는 길. */
  const runAuto = async () => {
    setResearching(true);
    setError("");
    try {
      const data = await api<{ submission: SubmissionDTO }>(
        `/api/submissions/${submission.id}/research`,
        { method: "POST" },
      );
      setDraft(toDraft(data.submission.research));
      setShowFields(true);
      onSaved("자동 조사를 마쳤어요. 값을 확인해주세요.");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "자동 조사에 실패했어요.");
    } finally {
      setResearching(false);
    }
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
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-3 py-1.5 text-[11px] text-fg55"
        >
          접기
        </button>
      </div>

      {autoEnabled ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[10px] border border-line8 bg-panel px-4 py-3">
          <span className="text-[12px] leading-relaxed text-fg55">
            {hasDraftContent(draft)
              ? "서버가 조사해 채워 둔 값이에요. 틀린 곳은 고치고 저장하세요."
              : "아직 조사 결과가 없어요. 아래 버튼을 누르면 지금 조사합니다."}
          </span>
          <button
            type="button"
            onClick={runAuto}
            disabled={researching}
            className="btn-grad px-3.5 py-2 text-xs disabled:opacity-50"
          >
            {researching ? "조사하는 중…" : hasDraftContent(draft) ? "다시 조사하기" : "자동으로 조사하기"}
          </button>
        </div>
      ) : null}

      {/*
        칸이 비어 있는 채로 열리면 "뭘 하라는 거지" 로 끝난다.
        아직 아무것도 없을 때는 칸을 감추고 할 일 세 가지만 크게 보여준다.
      */}
      <ol className={`flex-col gap-2.5 rounded-[10px] border border-line8 bg-panel px-4 py-3.5 ${autoEnabled && showFields ? "hidden" : "flex"}`}>
        <li className="flex flex-col gap-2">
          <div className="text-[13px] font-bold text-fg">
            1. 아래 버튼을 눌러 조사 프롬프트를 복사합니다
          </div>
          <div className="text-[11px] leading-relaxed text-fg45">
            &quot;{submission.title}&quot; 의 제보 내용이 이미 들어간 프롬프트예요. 그대로 쓰시면 됩니다.
          </div>
          <button
            type="button"
            onClick={copyPrompt}
            className="btn-grad self-start px-4 py-2 text-xs"
          >
            {copied ? "복사했어요 ✓" : "조사 프롬프트 복사하기"}
          </button>
        </li>
        <li className="flex flex-col gap-1">
          <div className="text-[13px] font-bold text-fg">
            2. 클로드(claude.ai) 새 대화에 붙여넣고 답을 받습니다
          </div>
          <div className="text-[11px] leading-relaxed text-fg45">
            웹 검색으로 찾아서 &quot;제목 : … / 카테고리 : …&quot; 형식으로 답이 나옵니다.
          </div>
        </li>
        <li className="flex flex-col gap-2">
          <div className="text-[13px] font-bold text-fg">3. 그 답을 통째로 아래 칸에 붙여넣습니다</div>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={3}
            placeholder="여기에 붙여넣으세요"
            className="w-full resize-y rounded-lg border border-line12 bg-surface4 px-3 py-2 text-xs text-fg placeholder:text-fg30"
          />
          <button
            type="button"
            onClick={applyPaste}
            disabled={!paste.trim()}
            className="self-start cursor-pointer rounded-lg border border-line12 bg-surface4 px-3.5 py-2 text-xs font-semibold text-fg disabled:opacity-40"
          >
            항목별로 나누기
          </button>
        </li>
      </ol>

      {!showFields ? (
        <button
          type="button"
          onClick={() => setShowFields(true)}
          className="self-start text-[11px] text-fg45 underline underline-offset-2"
        >
          조사 없이 직접 입력할래요 (17개 칸 펼치기)
        </button>
      ) : null}

      <div className={`grid grid-cols-1 gap-2 lg:grid-cols-2 ${showFields ? "" : "hidden"}`}>
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

      <div className={`flex-wrap gap-1.5 ${showFields ? "flex" : "hidden"}`}>
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
