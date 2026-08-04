"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { SpinnerIcon } from "@/components/icons";
import { ApiError, api } from "@/lib/client-api";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      router.replace(next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "로그인에 실패했어요.");
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6">
      <form
        onSubmit={submit}
        className="flex w-full max-w-[380px] flex-col gap-5 rounded-2xl border border-line8 bg-panel p-8"
      >
        <div className="flex items-baseline gap-[7px]">
          <span className="text-lg font-extrabold tracking-[-0.5px]">
            Dr.<span className="text-accent">GL</span>
          </span>
          <span className="text-[11px] font-semibold text-fg40">Admin</span>
        </div>
        <div className="text-[13px] leading-relaxed text-fg55">
          운영자 계정으로 로그인해주세요. 어드민은 사이트와 같은 데이터베이스를 관리해요.
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-fg70">이메일</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            className="field h-[42px] px-[13px] text-[13px]"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-fg70">비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="field h-[42px] px-[13px] text-[13px]"
          />
        </label>

        {error ? <div className="text-[13px] text-danger">{error}</div> : null}

        <button type="submit" disabled={pending} className="btn-grad h-[46px] text-sm">
          {pending ? <SpinnerIcon /> : "로그인"}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink" />}>
      <LoginForm />
    </Suspense>
  );
}
