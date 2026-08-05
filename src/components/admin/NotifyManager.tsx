"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Toast, useToast } from "@/components/admin/Toast";
import { ApiError, api } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";

export type NotifySignupDTO = { id: number; email: string; createdAt: string };

/**
 * 게시판 오픈 알림 신청자 목록.
 * 발송 기능은 아직 없으므로, 메일 프로그램에 붙여넣을 수 있게 내보내는 데 초점을 둔다.
 */
export function NotifyManager({ initialSignups }: { initialSignups: NotifySignupDTO[] }) {
  const router = useRouter();
  const [signups, setSignups] = useState(initialSignups);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<NotifySignupDTO | null>(null);
  const { toast, show } = useToast();

  const filtered = signups.filter((signup) =>
    signup.email.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const copyAll = async () => {
    const text = filtered.map((signup) => signup.email).join(", ");
    try {
      await navigator.clipboard.writeText(text);
      show(`${filtered.length}개 주소를 복사했어요. 메일 받는 사람 칸에 붙여넣으세요.`);
    } catch {
      window.prompt("아래 주소를 복사하세요", text);
    }
  };

  const downloadCsv = () => {
    // 엑셀에서 한글이 깨지지 않도록 BOM 을 붙인다.
    const rows = [["email", "signed_up_at"], ...filtered.map((s) => [s.email, s.createdAt])];
    const csv = `﻿${rows.map((row) => row.join(",")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `drgl-notify-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const remove = async (signup: NotifySignupDTO) => {
    try {
      await api(`/api/notify/${signup.id}`, { method: "DELETE" });
      setSignups((prev) => prev.filter((entry) => entry.id !== signup.id));
      router.refresh();
      show(`${signup.email} 신청을 삭제했어요.`);
    } catch (e) {
      show(e instanceof ApiError ? e.message : "삭제하지 못했어요.", "error");
    } finally {
      setTarget(null);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">오픈 알림 신청</h1>
          <p className="mt-1 text-[13px] text-fg50">
            게시판이 열리면 알려드리기로 한 분들이에요. 총 {signups.length}명.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copyAll}
            disabled={filtered.length === 0}
            className="btn-ghost px-4 py-2 text-xs text-fg70 disabled:opacity-40"
          >
            주소 모두 복사
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={filtered.length === 0}
            className="btn-ghost px-4 py-2 text-xs text-fg70 disabled:opacity-40"
          >
            CSV 내려받기
          </button>
        </div>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이메일 검색"
        className="field h-10 w-full max-w-[280px] px-3.5 text-[13px]"
      />

      <div className="overflow-hidden rounded-[14px] border border-line8 bg-panel">
        {filtered.length === 0 ? (
          <div className="py-15 text-center text-[13px] text-fg35">
            {signups.length === 0 ? "아직 신청한 분이 없어요." : "검색 결과가 없어요."}
          </div>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line8 text-left text-[11px] text-fg40">
                <th className="px-[18px] py-3 font-semibold">이메일</th>
                <th className="px-[18px] py-3 font-semibold">신청일</th>
                <th className="px-[18px] py-3 text-right font-semibold">관리</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((signup) => (
                <tr key={signup.id} className="border-b border-line6">
                  <td className="px-[18px] py-3 text-fg80">{signup.email}</td>
                  <td className="px-[18px] py-3 text-fg50">{formatDateTime(signup.createdAt)}</td>
                  <td className="px-[18px] py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setTarget(signup)}
                      className="btn-danger px-3 py-[6px] text-xs"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-fg35">
        수집 목적은 게시판 오픈 1회 안내예요. 발송 후에는 지우는 것이 개인정보처리방침에 적어둔 약속입니다.
        신청자가 취소를 요청하면 여기서 바로 삭제하세요.
      </p>

      {target ? (
        <ConfirmDialog
          title="신청을 삭제할까요?"
          description={`${target.email} 주소를 지웁니다. 되돌릴 수 없어요.`}
          confirmLabel="삭제"
          onConfirm={() => remove(target)}
          onCancel={() => setTarget(null)}
        />
      ) : null}

      <Toast toast={toast} />
    </>
  );
}
