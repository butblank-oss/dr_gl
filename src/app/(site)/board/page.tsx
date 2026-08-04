"use client";

import { useState } from "react";
import { ChatIcon, SpinnerIcon } from "@/components/icons";

const PREVIEW_CATEGORIES = ["자유게시판", "작품 후기", "추천 요청", "착즙 정보 공유"];

export default function BoardPage() {
  const [email, setEmail] = useState("");
  const [notified, setNotified] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "알림 신청에 실패했어요.");
        return;
      }
      setNotified(true);
    } catch {
      setError("네트워크 오류로 알림을 신청하지 못했어요.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-[26px] px-10 pb-40 pt-[130px] text-center">
      <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-accent-soft12">
        <ChatIcon className="text-accent" />
      </div>
      <div className="text-[26px] font-extrabold">게시판, 곧 열립니다</div>
      <div className="max-w-[420px] text-sm leading-[1.65] text-fg55">
        회원들과 작품 취향을 나누고, 후기와 추천을 주고받는 공간을 준비하고 있어요.
      </div>
      <div className="pointer-events-none flex flex-wrap justify-center gap-2.5 opacity-40">
        {PREVIEW_CATEGORIES.map((name) => (
          <span key={name} className="rounded-pill border border-line14 px-4 py-[9px] text-[13px]">
            {name}
          </span>
        ))}
      </div>

      {notified ? (
        <div className="mt-1.5 text-sm font-semibold text-accent">
          알림 신청 완료! 오픈하면 가장 먼저 알려드릴게요.
        </div>
      ) : (
        <>
          <div className="mt-1.5 flex gap-2.5">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="이메일 주소"
              aria-label="오픈 알림 받을 이메일"
              className="field h-11 w-[220px] px-4 text-[13px]"
            />
            <button type="button" onClick={submit} disabled={pending} className="btn-grad h-11 px-5 text-sm">
              {pending ? <SpinnerIcon /> : "오픈 알림 받기"}
            </button>
          </div>
          {error ? <div className="text-[13px] text-danger">{error}</div> : null}
        </>
      )}
    </div>
  );
}
