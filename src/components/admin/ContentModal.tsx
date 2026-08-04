"use client";

import { useState } from "react";
import { SpinnerIcon } from "@/components/icons";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { ApiError, api } from "@/lib/client-api";
import { COUNTRIES, CREATOR_LABELS } from "@/lib/types";
import type { ContentDTO, Country, CreatorLabel, PlatformType, SubmissionDTO } from "@/lib/types";

export type PlatformDraft = { name: string; type: PlatformType; url: string };

export type ContentDraft = {
  id: number | null;
  /** 제보 검토·발행으로 열린 경우에만 채워진다. */
  sourceSubmissionId: number | null;
  sourceUrl: string;
  sourceContact: string;
  title: string;
  category: string;
  country: Country;
  countryDetail: string;
  year: string;
  creatorLabel: CreatorLabel;
  creatorName: string;
  leadsInput: string;
  tagsInput: string;
  juice: boolean;
  poster: boolean;
  posterUrl: string | null;
  backdropUrl: string | null;
  synopsis: string;
  platforms: PlatformDraft[];
};

const emptyPlatform = (): PlatformDraft => ({ name: "", type: "유료", url: "" });

export function makeAddDraft(categories: string[]): ContentDraft {
  return {
    id: null,
    sourceSubmissionId: null,
    sourceUrl: "",
    sourceContact: "",
    title: "",
    category: categories[0] ?? "",
    country: "국내",
    countryDetail: "한국",
    year: String(new Date().getFullYear()),
    creatorLabel: "감독",
    creatorName: "",
    leadsInput: "",
    tagsInput: "",
    juice: false,
    poster: true,
    posterUrl: null,
    backdropUrl: null,
    synopsis: "",
    platforms: [emptyPlatform()],
  };
}

export function makeEditDraft(item: ContentDTO): ContentDraft {
  return {
    id: item.id,
    sourceSubmissionId: null,
    sourceUrl: "",
    sourceContact: "",
    title: item.title,
    category: item.category,
    country: (item.country === "해외" ? "해외" : "국내") as Country,
    countryDetail: item.countryDetail,
    year: String(item.year),
    creatorLabel: (CREATOR_LABELS.includes(item.creatorLabel as CreatorLabel)
      ? item.creatorLabel
      : "감독") as CreatorLabel,
    creatorName: item.creatorName,
    leadsInput: item.leads.join(", "),
    tagsInput: item.tags.join(", "),
    juice: item.juice,
    poster: item.poster,
    posterUrl: item.posterUrl,
    backdropUrl: item.backdropUrl,
    synopsis: item.synopsis,
    platforms: item.platforms.length
      ? item.platforms.map((p) => ({ name: p.name, type: p.type, url: p.url ?? "" }))
      : [emptyPlatform()],
  };
}

/** 제보 데이터를 미리 채운 초안 — 콘텐츠 추가/수정과 완전히 동일한 폼을 쓴다. */
export function makeSubmissionDraft(submission: SubmissionDTO, categories: string[]): ContentDraft {
  return {
    id: null,
    sourceSubmissionId: submission.id,
    sourceUrl: submission.url,
    sourceContact: submission.contact,
    title: submission.title,
    category: categories.includes(submission.category) ? submission.category : (categories[0] ?? ""),
    country: (submission.country === "해외" ? "해외" : "국내") as Country,
    countryDetail: submission.country === "국내" ? "한국" : "",
    year: String(new Date().getFullYear()),
    creatorLabel: "감독",
    creatorName: "",
    leadsInput: "",
    tagsInput: "",
    juice: submission.juice,
    // 발행 전에 썸네일을 넣을 수 있도록 업로드 칸을 처음부터 열어둔다.
    poster: true,
    posterUrl: null,
    backdropUrl: null,
    synopsis: submission.note ?? "",
    platforms: submission.url
      ? [
          {
            name: submission.platform?.trim() || "제보된 링크",
            type: "유료" as PlatformType,
            url: submission.url,
          },
        ]
      : [emptyPlatform()],
  };
}

function splitList(raw: string): string[] {
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

type Props = {
  draft: ContentDraft;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
};

export function ContentModal({ draft: initial, categories, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const patch = (partial: Partial<ContentDraft>) => setDraft((d) => ({ ...d, ...partial }));
  const isFromSubmission = draft.sourceSubmissionId != null;
  const modalTitle = isFromSubmission ? "제보 검토 · 발행" : draft.id == null ? "콘텐츠 추가" : "콘텐츠 수정";
  const saveLabel = isFromSubmission ? "승인 및 발행" : "저장";

  const updatePlatform = (index: number, partial: Partial<PlatformDraft>) =>
    setDraft((d) => ({
      ...d,
      platforms: d.platforms.map((p, i) => (i === index ? { ...p, ...partial } : p)),
    }));

  const save = async () => {
    if (!draft.title.trim() || !draft.category) {
      setError("제목과 카테고리는 필수예요.");
      return;
    }
    setPending(true);
    setError("");

    const payload = {
      title: draft.title.trim(),
      category: draft.category,
      country: draft.country,
      countryDetail: draft.countryDetail,
      year: Number(draft.year) || new Date().getFullYear(),
      creatorLabel: draft.creatorLabel,
      creatorName: draft.creatorName,
      leads: splitList(draft.leadsInput),
      tags: splitList(draft.tagsInput),
      juice: draft.juice,
      poster: draft.poster,
      posterUrl: draft.posterUrl,
      backdropUrl: draft.backdropUrl,
      synopsis: draft.synopsis,
      platforms: draft.platforms
        .filter((p) => p.name.trim())
        .map((p) => ({ name: p.name.trim(), type: p.type, url: p.url.trim() })),
    };

    try {
      if (isFromSubmission) {
        // 콘텐츠 생성 + 제보 승인이 서버에서 하나의 트랜잭션으로 처리된다.
        await api(`/api/submissions/${draft.sourceSubmissionId}/publish`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else if (draft.id == null) {
        await api("/api/content", { method: "POST", body: JSON.stringify(payload) });
      } else {
        await api(`/api/content/${draft.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      }
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "저장하지 못했어요.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-[rgba(0,0,0,0.6)] p-3 md:p-10"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-[620px] flex-col gap-[18px] overflow-y-auto rounded-[18px] border border-line10 bg-modal p-5 md:max-h-[88vh] md:p-[30px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xl font-extrabold">{modalTitle}</div>

        {isFromSubmission ? (
          <div className="flex flex-col gap-1.5 rounded-[10px] border border-accent-line bg-accent-soft8 px-3.5 py-3">
            <div className="text-[11px] font-bold text-accent">제보 원본 (참고용)</div>
            <div className="break-all text-xs text-fg60">링크: {draft.sourceUrl}</div>
            <div className="text-xs text-fg60">연락처: {draft.sourceContact || "없음"}</div>
          </div>
        ) : null}

        <label className="flex flex-col gap-[7px]">
          <span className="text-xs font-semibold text-fg70">제목</span>
          <input
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            className="field h-[42px] px-[13px] text-[13px]"
          />
        </label>

        <div className="grid grid-cols-2 gap-3.5">
          <label className="flex flex-col gap-[7px]">
            <span className="text-xs font-semibold text-fg70">카테고리</span>
            <select
              value={draft.category}
              onChange={(e) => patch({ category: e.target.value })}
              className="field h-[42px] px-[13px] text-[13px]"
            >
              {categories.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-[7px]">
            <span className="text-xs font-semibold text-fg70">연도</span>
            <input
              value={draft.year}
              onChange={(e) => patch({ year: e.target.value })}
              inputMode="numeric"
              className="field h-[42px] px-[13px] text-[13px]"
            />
          </label>
        </div>

        <div className="flex flex-col gap-[7px]">
          <span className="text-xs font-semibold text-fg70">국가</span>
          <div className="flex gap-2">
            {COUNTRIES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => patch({ country: name })}
                className={`chip !px-[15px] !py-2 !text-xs ${draft.country === name ? "chip-on" : "chip-off"}`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-[7px]">
          <span className="text-xs font-semibold text-fg70">국가 상세 (예: 한국, 일본, 미국)</span>
          <input
            value={draft.countryDetail}
            onChange={(e) => patch({ countryDetail: e.target.value })}
            className="field h-[42px] px-[13px] text-[13px]"
          />
        </label>

        <div className="flex flex-col gap-[7px]">
          <span className="text-xs font-semibold text-fg70">제작자 구분</span>
          <div className="flex gap-2">
            {CREATOR_LABELS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => patch({ creatorLabel: name })}
                className={`chip !px-[15px] !py-2 !text-xs ${draft.creatorLabel === name ? "chip-on" : "chip-off"}`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-[7px]">
          <span className="text-xs font-semibold text-fg70">제작자 이름</span>
          <input
            value={draft.creatorName}
            onChange={(e) => patch({ creatorName: e.target.value })}
            className="field h-[42px] px-[13px] text-[13px]"
          />
        </label>

        <label className="flex flex-col gap-[7px]">
          <span className="text-xs font-semibold text-fg70">출연 · 주인공 (쉼표로 구분)</span>
          <input
            value={draft.leadsInput}
            onChange={(e) => patch({ leadsInput: e.target.value })}
            placeholder="예: 김민희, 김태리"
            className="field h-[42px] px-[13px] text-[13px]"
          />
        </label>

        <label className="flex flex-col gap-[7px]">
          <span className="text-xs font-semibold text-fg70">태그 (쉼표로 구분)</span>
          <input
            value={draft.tagsInput}
            onChange={(e) => patch({ tagsInput: e.target.value })}
            placeholder="예: 로맨스, 시대극"
            className="field h-[42px] px-[13px] text-[13px]"
          />
        </label>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => patch({ juice: !draft.juice })}
            className={`chip !px-[15px] !py-2 !text-xs ${draft.juice ? "chip-juice-on" : "chip-off"}`}
          >
            착즙 작품
          </button>
          <button
            type="button"
            onClick={() => patch({ poster: !draft.poster })}
            className={`chip !px-[15px] !py-2 !text-xs ${draft.poster ? "chip-on" : "chip-off"}`}
          >
            포스터 이미지 사용
          </button>
        </div>

        {/* 업로드 칸은 토글과 무관하게 항상 보인다. 이미지를 올리면 자동으로 "포스터 사용"이 켜진다. */}
        <ImageUploadField
          label="카드 썸네일 · 세로 포스터 (사이트에 바로 반영돼요)"
          hint="영화 포스터처럼 세로 2:3 비율을 권장해요. 카드와 상세 화면이 이 비율에 맞춰져 있어요."
          kind="poster"
          value={draft.posterUrl}
          onChange={(url) => patch({ posterUrl: url, poster: url ? true : draft.poster })}
        />
        <ImageUploadField
          label="상세·히어로 배경 이미지 (선택)"
          hint="가로로 넓은 스틸컷을 넣는 자리예요. 비워두면 세로 포스터를 흐리게 깔아서 자연스럽게 처리해요."
          kind="backdrop"
          value={draft.backdropUrl}
          onChange={(url) => patch({ backdropUrl: url, poster: url ? true : draft.poster })}
          width={214}
          height={120}
        />

        <label className="flex flex-col gap-[7px]">
          <span className="text-xs font-semibold text-fg70">줄거리</span>
          <textarea
            value={draft.synopsis}
            onChange={(e) => patch({ synopsis: e.target.value })}
            className="field h-[90px] resize-none px-[13px] py-3 text-[13px]"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-fg70">시청·감상 가능한 곳</span>
          {draft.platforms.map((platform, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <input
                value={platform.name}
                onChange={(e) => updatePlatform(index, { name: e.target.value })}
                placeholder="플랫폼 이름 (예: 왓챠)"
                className="field h-10 w-full flex-none px-3 text-[13px] sm:w-[150px]"
              />
              <input
                value={platform.url}
                onChange={(e) => updatePlatform(index, { url: e.target.value })}
                placeholder="https:// 실제 링크"
                className="field h-10 min-w-0 flex-1 px-3 text-[13px]"
              />
              <button
                type="button"
                onClick={() => updatePlatform(index, { type: platform.type === "유료" ? "무료" : "유료" })}
                className={
                  platform.type === "무료"
                    ? "h-10 cursor-pointer whitespace-nowrap rounded-lg border-none bg-[rgba(155,126,232,0.16)] px-3.5 text-xs font-bold text-accent"
                    : "h-10 cursor-pointer whitespace-nowrap rounded-lg border-none bg-surface6 px-3.5 text-xs font-bold text-fg70"
                }
              >
                {platform.type}
              </button>
              <button
                type="button"
                aria-label="링크 삭제"
                onClick={() =>
                  setDraft((d) => ({ ...d, platforms: d.platforms.filter((_, i) => i !== index) }))
                }
                className="h-9 w-9 cursor-pointer rounded-lg border border-line12 bg-surface4 text-sm text-fg60"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setDraft((d) => ({ ...d, platforms: [...d.platforms, emptyPlatform()] }))}
            className="cursor-pointer self-start rounded-lg border border-dashed border-line20 bg-transparent px-3.5 py-[7px] text-xs text-fg60"
          >
            + 링크 추가
          </button>
        </div>

        {error ? <div className="text-[13px] text-danger">{error}</div> : null}

        <div className="mt-1.5 flex justify-end gap-2.5">
          <button type="button" onClick={onClose} className="btn-ghost px-5 py-[11px] text-[13px]">
            취소
          </button>
          <button type="button" onClick={save} disabled={pending} className="btn-grad px-[22px] py-[11px] text-[13px]">
            {pending ? <SpinnerIcon /> : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
