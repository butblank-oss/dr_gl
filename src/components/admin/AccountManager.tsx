"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Toast, useToast } from "@/components/admin/Toast";
import { SpinnerIcon } from "@/components/icons";
import { ApiError, api } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import { ADMIN_ROLE_LABELS, ADMIN_ROLES } from "@/lib/types";
import type { AdminRole, AdminUserDTO, SessionUser } from "@/lib/types";

const ROLE_HELP: Record<AdminRole, string> = {
  ADMIN: "모든 기능 + 계정 관리까지 할 수 있어요.",
  EDITOR: "콘텐츠·제보·한줄평·카테고리·홈 큐레이션을 모두 다룰 수 있어요. 계정 관리만 못 해요.",
};

const emptyForm = { email: "", name: "", password: "", role: "EDITOR" as AdminRole };

export function AccountManager({
  initialAdmins,
  me,
}: {
  initialAdmins: AdminUserDTO[];
  me: SessionUser;
}) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [form, setForm] = useState(emptyForm);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<AdminUserDTO | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUserDTO | null>(null);
  const [resetValue, setResetValue] = useState("");
  const [resetError, setResetError] = useState("");
  const { toast, show } = useToast();

  const reload = async () => {
    const data = await api<{ admins: AdminUserDTO[] }>("/api/admins");
    setAdmins(data.admins);
  };

  const create = async () => {
    if (creating) return;
    setCreating(true);
    setCreateError("");
    try {
      await api("/api/admins", { method: "POST", body: JSON.stringify(form) });
      const created = form.email;
      setForm(emptyForm);
      await reload();
      show(`${created} 계정을 만들었어요.`);
    } catch (e) {
      setCreateError(e instanceof ApiError ? e.message : "계정을 만들지 못했어요.");
    } finally {
      setCreating(false);
    }
  };

  const patch = async (admin: AdminUserDTO, body: Record<string, unknown>, message: string) => {
    try {
      await api(`/api/admins/${admin.id}`, { method: "PATCH", body: JSON.stringify(body) });
      await reload();
      show(message);
    } catch (e) {
      show(e instanceof ApiError ? e.message : "변경하지 못했어요.", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    try {
      await api(`/api/admins/${target.id}`, { method: "DELETE" });
      await reload();
      show(`${target.email} 계정을 삭제했어요.`);
    } catch (e) {
      show(e instanceof ApiError ? e.message : "삭제하지 못했어요.", "error");
    }
  };

  const submitReset = async () => {
    if (!resetTarget) return;
    setResetError("");
    try {
      await api(`/api/admins/${resetTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({ password: resetValue }),
      });
      const email = resetTarget.email;
      setResetTarget(null);
      setResetValue("");
      show(`${email} 의 비밀번호를 바꿨어요. 본인에게 전달해주세요.`);
    } catch (e) {
      setResetError(e instanceof ApiError ? e.message : "비밀번호를 바꾸지 못했어요.");
    }
  };

  return (
    <>
      <h1 className="text-2xl font-extrabold">계정 관리</h1>
      <p className="-mt-3 text-[13px] leading-relaxed text-fg55">
        운영자 계정을 만들어 콘텐츠 등록과 한줄평 검수를 맡길 수 있어요. 이 화면은 슈퍼관리자만 볼 수 있어요.
      </p>

      <section className="flex flex-col gap-3 rounded-[14px] border border-line8 bg-panel p-5">
        <div className="text-sm font-bold">새 계정 만들기</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-[7px]">
            <span className="text-xs font-semibold text-fg70">이메일 (로그인 아이디)</span>
            <input
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="operator@example.com"
              autoComplete="off"
              className="field h-[42px] px-[13px] text-[13px]"
            />
          </label>
          <label className="flex flex-col gap-[7px]">
            <span className="text-xs font-semibold text-fg70">이름 (선택)</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="예: 김운영"
              className="field h-[42px] px-[13px] text-[13px]"
            />
          </label>
          <label className="flex flex-col gap-[7px]">
            <span className="text-xs font-semibold text-fg70">임시 비밀번호 (8자 이상)</span>
            <input
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              type="text"
              autoComplete="new-password"
              placeholder="본인에게 전달한 뒤 바꾸게 하세요"
              className="field h-[42px] px-[13px] text-[13px]"
            />
          </label>
          <div className="flex flex-col gap-[7px]">
            <span className="text-xs font-semibold text-fg70">역할</span>
            <div className="flex gap-2">
              {ADMIN_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, role }))}
                  className={`chip !px-[15px] !py-2 !text-xs ${form.role === role ? "chip-on" : "chip-off"}`}
                >
                  {ADMIN_ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-xs leading-relaxed text-fg40">{ROLE_HELP[form.role]}</div>
        {createError ? <div className="text-[13px] text-danger">{createError}</div> : null}

        <button
          type="button"
          onClick={create}
          disabled={creating}
          className="btn-grad h-[42px] w-fit px-[18px] text-[13px]"
        >
          {creating ? <SpinnerIcon /> : "+ 계정 만들기"}
        </button>
      </section>

      <div className="overflow-hidden rounded-[14px] border border-line8 bg-panel">
        {admins.map((admin) => {
          const isMe = admin.id === me.id;
          return (
            <div
              key={admin.id}
              className="flex flex-col gap-3 border-b border-line6 px-[18px] py-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold">{admin.name || admin.email}</span>
                  <span
                    className={
                      admin.role === "ADMIN"
                        ? "rounded-pill bg-accent-soft px-[9px] py-[3px] text-[10px] font-bold text-accent"
                        : "rounded-pill bg-surface6 px-[9px] py-[3px] text-[10px] font-semibold text-fg55"
                    }
                  >
                    {ADMIN_ROLE_LABELS[admin.role]}
                  </span>
                  {isMe ? (
                    <span className="rounded-pill bg-surface6 px-[9px] py-[3px] text-[10px] text-fg40">나</span>
                  ) : null}
                  {!admin.isActive ? (
                    <span className="rounded-pill bg-danger-soft px-[9px] py-[3px] text-[10px] font-bold text-danger">
                      비활성
                    </span>
                  ) : null}
                </div>
                <div className="truncate text-xs text-fg55">{admin.email}</div>
                <div className="text-[11px] text-fg30">
                  마지막 로그인 · {admin.lastLoginAt ? formatDateTime(admin.lastLoginAt) : "기록 없음"}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    patch(
                      admin,
                      { role: admin.role === "ADMIN" ? "EDITOR" : "ADMIN" },
                      "역할을 바꿨어요.",
                    )
                  }
                  className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-3 py-1.5 text-xs text-fg"
                >
                  {admin.role === "ADMIN" ? "운영자로 변경" : "슈퍼관리자로 변경"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetTarget(admin);
                    setResetValue("");
                    setResetError("");
                  }}
                  className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-3 py-1.5 text-xs text-fg"
                >
                  비밀번호 재설정
                </button>
                <button
                  type="button"
                  disabled={isMe}
                  onClick={() =>
                    patch(
                      admin,
                      { isActive: !admin.isActive },
                      admin.isActive ? "계정을 비활성화했어요." : "계정을 다시 활성화했어요.",
                    )
                  }
                  className="cursor-pointer rounded-lg border border-line12 bg-surface4 px-3 py-1.5 text-xs text-fg disabled:opacity-35"
                >
                  {admin.isActive ? "비활성화" : "활성화"}
                </button>
                <button
                  type="button"
                  disabled={isMe}
                  onClick={() => setDeleting(admin)}
                  className="btn-danger px-3 py-1.5 text-xs disabled:opacity-35"
                >
                  삭제
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {resetTarget ? (
        <div
          className="fixed inset-0 z-110 flex items-center justify-center bg-[rgba(0,0,0,0.6)] p-5"
          onClick={() => setResetTarget(null)}
          role="presentation"
        >
          <div
            className="flex w-full max-w-[380px] flex-col gap-3 rounded-2xl border border-line10 bg-modal p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-base font-bold">비밀번호 재설정</div>
            <div className="text-[13px] text-fg60">{resetTarget.email}</div>
            <input
              value={resetValue}
              onChange={(e) => setResetValue(e.target.value)}
              placeholder="새 비밀번호 (8자 이상)"
              autoComplete="new-password"
              className="field h-[42px] px-[13px] text-[13px]"
            />
            {resetError ? <div className="text-xs text-danger">{resetError}</div> : null}
            <div className="mt-1 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="btn-ghost px-4 py-2.5 text-[13px]"
              >
                취소
              </button>
              <button type="button" onClick={submitReset} className="btn-grad px-4 py-2.5 text-[13px]">
                변경
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={`${deleting.email} 계정을 삭제할까요?`}
          description="다시 로그인할 수 없게 돼요. 잠시 막아두려는 거라면 '비활성화'를 쓰세요."
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      ) : null}

      <Toast toast={toast} />
    </>
  );
}
