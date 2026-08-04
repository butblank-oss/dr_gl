"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckIcon, SpinnerIcon } from "@/components/icons";
import { COUNTRIES } from "@/lib/types";

type Props = { categories: string[] };

const emptyForm = (firstCategory: string) => ({
  title: "",
  category: firstCategory,
  country: "국내" as (typeof COUNTRIES)[number],
  juice: false,
  url: "",
  note: "",
  contact: "",
});

export function SubmitForm({ categories }: Props) {
  const firstCategory = categories[0] ?? "";
  const [form, setForm] = useState(emptyForm(firstCategory));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const reset = () => {
    setForm(emptyForm(firstCategory));
    setError("");
    setSubmitted(false);
  };

  const submit = async () => {
    if (!form.title.trim() || !form.url.trim()) {
      setError("제목과 링크는 꼭 입력해주세요.");
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
        return;
      }
      setSubmitted(true);
    } catch {
      setError("네트워크 오류로 제보를 등록하지 못했어요.");
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
          <button type="button" onClick={reset} className="btn-ghost px-[22px] py-3 text-sm">
            제보 하나 더 하기
          </button>
          <Link href="/" className="btn-grad px-[22px] py-3 text-sm">
            홈으로
          </Link>
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
        <span className="text-[13px] font-semibold text-fg75">시청/감상 링크</span>
        <input
          value={form.url}
          onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          placeholder="https://"
          className="field h-11 px-3.5 text-sm"
        />
        <span className="text-xs leading-relaxed text-fg40">
          공식 링크가 없다면 구글 드라이브에 자료를 올리고 폴더 링크를 붙여넣어도 돼요.{" "}
          <a href="https://drive.google.com" target="_blank" rel="noreferrer">
            구글 드라이브 열기 →
          </a>
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
