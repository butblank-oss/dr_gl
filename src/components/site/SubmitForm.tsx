"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { TrackedButton, TrackedExternalLink, TrackedLink } from "@/components/analytics/TrackedLink";
import { CheckIcon, SpinnerIcon } from "@/components/icons";
import { EVENTS, track } from "@/lib/analytics";
import { COUNTRIES } from "@/lib/types";

/** 중복 안내에 쓰는 최소 정보 — /api/content/duplicate 응답과 같다. */
type DuplicateMatch = { id: number; title: string; category: string; year: number };

type Props = { categories: string[] };

const emptyForm = (firstCategory: string) => ({
  title: "",
  category: firstCategory,
  country: "국내" as (typeof COUNTRIES)[number],
  juice: false,
  platform: "",
  url: "",
  note: "",
  contact: "",
});

export function SubmitForm({ categories }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firstCategory = categories[0] ?? "";
  const [form, setForm] = useState(emptyForm(firstCategory));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  // 완료 상태를 URL(?done=1)에 둔다. 그래야 완료 화면에서 헤더의 "+ 제보하기"를 눌렀을 때
  // 같은 주소라 아무 일도 일어나지 않던 문제가 사라진다.
  const submitted = searchParams.get("done") === "1";

  // 제보 폼을 실제로 연 순간이 깔때기의 시작점이다. (완료 화면은 제외)
  useEffect(() => {
    if (!submitted) track(EVENTS.submitStart);
  }, [submitted]);

  // 제목을 적는 동안 이미 등록된 작품인지 알려준다. 막지는 않는다 —
  // 같은 작품이어도 새 시청처 링크를 알려주는 제보일 수 있어서다.
  const [known, setKnown] = useState<DuplicateMatch[]>([]);
  const [pendingDup, setPendingDup] = useState(0);
  const title = form.title.trim();

  useEffect(() => {
    if (title.length < 2) {
      setKnown([]);
      setPendingDup(0);
      return;
    }
    let alive = true;
    const timer = setTimeout(() => {
      fetch(`/api/content/duplicate?title=${encodeURIComponent(title)}`)
        .then((res) => res.json())
        .then((data) => {
          if (!alive) return;
          setKnown(data.matches ?? []);
          setPendingDup(data.pending ?? 0);
        })
        .catch(() => {
          // 확인에 실패해도 제보는 그대로 할 수 있어야 한다.
        });
    }, 400);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [title]);

  const reset = () => {
    setForm(emptyForm(firstCategory));
    setError("");
    router.replace("/submit");
  };

  const submit = async () => {
    if (!form.title.trim() || !form.url.trim()) {
      setError("제목과 링크는 꼭 입력해주세요.");
      track(EVENTS.submitError, { reason: "필수값 누락" });
      return;
    }
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "제보를 등록하지 못했어요.");
        track(EVENTS.submitError, { reason: "서버 거절", http_status: res.status });
        return;
      }
      track(EVENTS.submitComplete, {
        submit_category: form.category,
        submit_country: form.country,
        juice: form.juice,
        has_platform: Boolean(form.platform.trim()),
        has_contact: Boolean(form.contact.trim()),
      });
      router.replace("/submit?done=1");
    } catch {
      setError("네트워크 오류로 제보를 등록하지 못했어요.");
      track(EVENTS.submitError, { reason: "네트워크" });
    } finally {
      setPending(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-[22px] px-5 pb-24 pt-20 text-center md:px-10 md:pb-40 md:pt-[130px]">
        <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-accent-soft12">
          <CheckIcon className="text-accent" />
        </div>
        <div className="text-2xl font-extrabold">제보 완료! 검토 후 등록할게요</div>
        <div className="max-w-[440px] text-sm leading-[1.65] text-fg55">
          운영팀이 링크와 내용을 확인한 뒤 실제 목록에 반영해요. 기준에 맞지 않는 제보는 별도 안내 없이 반영되지
          않을 수 있어요.
        </div>
        <div className="mt-1.5 flex gap-2.5">
          <TrackedButton
            type="button"
            onClick={reset}
            className="btn-ghost px-[22px] py-3 text-sm"
            event={EVENTS.nav}
            params={{ label: "제보 하나 더 하기", nav_source: "제보 완료" }}
          >
            제보 하나 더 하기
          </TrackedButton>
          <TrackedLink
            href="/"
            className="btn-grad px-[22px] py-3 text-sm"
            event={EVENTS.nav}
            params={{ label: "홈으로", nav_to: "/", nav_source: "제보 완료" }}
          >
            홈으로
          </TrackedLink>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-[26px] px-5 pb-25 pt-10 md:px-10 md:pt-14">
      <div>
        <div className="mb-2 text-[26px] font-extrabold">콘텐츠 제보하기</div>
        <div className="text-sm leading-relaxed text-fg55">
          놓치기 아까운 작품이 있다면 알려주세요. 제보된 콘텐츠는 운영팀 검토 후 목록에 등록돼요.
        </div>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-fg75">작품 제목</span>
        <input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="예: 아가씨"
          className="field h-11 px-3.5 text-sm"
        />
        {known.length > 0 ? (
          <div className="flex flex-col gap-1.5 rounded-[10px] border border-accent-line bg-accent-soft8 px-3.5 py-3">
            <div className="text-[13px] font-semibold text-accent">이미 등록된 작품이에요</div>
            {known.map((match) => (
              <TrackedLink
                key={match.id}
                href={`/content/${match.id}`}
                className="text-[13px] text-fg75 underline underline-offset-2"
                event={EVENTS.nav}
                params={{ label: "중복 안내에서 작품 보기", to: `/content/${match.id}` }}
              >
                {match.title} · {match.category} {match.year} 보러가기 →
              </TrackedLink>
            ))}
            <div className="text-xs leading-relaxed text-fg50">
              등록되지 않은 <strong className="text-fg70">새 시청처 링크</strong>를 알려주시는 거라면 그대로
              제보해주세요. 확인 후 해당 작품에 추가할게요.
            </div>
          </div>
        ) : pendingDup > 0 ? (
          <div className="rounded-[10px] border border-line12 bg-surface4 px-3.5 py-3 text-xs leading-relaxed text-fg55">
            같은 제목의 제보가 이미 <strong className="text-fg75">{pendingDup}건</strong> 검토 대기 중이에요.
            추가로 알려주실 내용이 있으면 그대로 보내주세요.
          </div>
        ) : null}
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-fg75">형식</span>
        <div className="flex flex-wrap gap-2">
          {categories.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setForm((f) => ({ ...f, category: name }))}
              className={`chip ${form.category === name ? "chip-on" : "chip-off"}`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-fg75">국가</span>
        <div className="flex flex-wrap gap-2">
          {COUNTRIES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setForm((f) => ({ ...f, country: name }))}
              className={`chip ${form.country === name ? "chip-on" : "chip-off"}`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, juice: !f.juice }))}
          className={`chip ${form.juice ? "chip-juice-on" : "chip-off"}`}
        >
          착즙 작품이에요 (서브 · 약한 GL 코드)
        </button>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-fg75">
          어디서 볼 수 있나요? <span className="font-normal text-fg40">(플랫폼 이름)</span>
        </span>
        <input
          value={form.platform}
          onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
          placeholder="예: 왓챠, 네이버웹툰, 카카오페이지"
          className="field h-11 px-3.5 text-sm"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-fg75">시청/감상 링크</span>
        <input
          value={form.url}
          onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          placeholder="https://"
          className="field h-11 px-3.5 text-sm"
        />
        <span className="text-xs leading-relaxed text-fg40">
          공식 링크가 없다면 구글 드라이브에 자료를 올리고 폴더 링크를 붙여넣어도 돼요.{" "}
          <TrackedExternalLink
            href="https://drive.google.com"
            target="_blank"
            rel="noreferrer"
            event={EVENTS.nav}
            params={{ label: "구글 드라이브 열기", nav_source: "제보 폼" }}
          >
            구글 드라이브 열기 →
          </TrackedExternalLink>
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-fg75">제보 사유 · 한줄 코멘트 (선택)</span>
        <textarea
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          placeholder="어떤 점이 좋았는지 알려주세요"
          className="field h-[88px] resize-none px-3.5 py-3 text-sm"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-fg75">답변 받을 이메일 (선택)</span>
        <input
          value={form.contact}
          onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
          placeholder="you@example.com"
          className="field h-11 px-3.5 text-sm"
        />
      </label>

      {error ? <div className="text-[13px] text-danger">{error}</div> : null}

      <button type="button" onClick={submit} disabled={pending} className="btn-grad h-[50px] text-[15px]">
        {pending ? <SpinnerIcon /> : "제보 제출하기"}
      </button>
    </div>
  );
}
