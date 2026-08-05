"use client";

import { useState } from "react";
import { SpinnerIcon } from "@/components/icons";
import { ApiError, api } from "@/lib/client-api";

/** 사이드바에서 여는 내 비밀번호 변경. 운영자도 쓸 수 있다. */
export function PasswordChange({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await api("/api/admins/me/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "비밀번호를 바꾸지 못했어요.");
    } finally {
      setPending(false);
    }
  };

  return (
    // 입력 도중 바깥을 눌러 닫히지 않도록 한다.
    <div className="fixed inset-0 z-110 flex items-center justify-center bg-[rgba(0,0,0,0.6)] p-5">
      <div className="flex w-full max-w-[380px] flex-col gap-3 rounded-2xl border border-line10 bg-modal p-6">
        <div className="text-base font-bold">내 비밀번호 변경</div>

        {done ? (
          <>
            <div className="text-[13px] text-accent">비밀번호를 바꿨어요.</div>
            <button type="button" onClick={onClose} className="btn-grad mt-1 h-10 text-[13px]">
              닫기
            </button>
          </>
        ) : (
          <>
            <input
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              placeholder="현재 비밀번호"
              className="field h-[42px] px-[13px] text-[13px]"
            />
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              autoComplete="new-password"
              placeholder="새 비밀번호 (8자 이상)"
              className="field h-[42px] px-[13px] text-[13px]"
            />
            {error ? <div className="text-xs text-danger">{error}</div> : null}
            <div className="mt-1 flex justify-end gap-2.5">
              <button type="button" onClick={onClose} className="btn-ghost px-4 py-2.5 text-[13px]">
                취소
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="btn-grad px-4 py-2.5 text-[13px]"
              >
                {pending ? <SpinnerIcon /> : "변경"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
