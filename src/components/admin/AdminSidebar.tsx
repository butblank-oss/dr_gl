"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/client-api";
import type { SessionUser } from "@/lib/types";

const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/content", label: "콘텐츠 관리" },
  { href: "/admin/home-rows", label: "홈 큐레이션" },
  { href: "/admin/categories", label: "카테고리 관리" },
  { href: "/admin/submissions", label: "제보 검토", badgeKey: "pending" as const },
  { href: "/admin/comments", label: "한줄평 검수" },
];

const ACTIVE =
  "flex items-center justify-between rounded-[10px] px-3.5 py-[11px] text-sm font-bold text-white bg-[linear-gradient(135deg,#8A6EEA,#6F4FD1)]";
const INACTIVE =
  "flex items-center justify-between rounded-[10px] px-3.5 py-[11px] text-sm font-medium text-fg65 hover:bg-surface5";

export function AdminSidebar({ user, pendingCount }: { user: SessionUser; pendingCount: number }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <aside className="flex w-[232px] flex-none flex-col gap-0.5 border-r border-line8 bg-panel px-3.5 py-6">
      <div className="flex items-baseline gap-[7px] px-2.5 pb-[26px] pt-1.5">
        <span className="text-lg font-extrabold tracking-[-0.5px]">
          Dr.<span className="text-accent">GL</span>
        </span>
        <span className="text-[11px] font-semibold text-fg40">Admin</span>
      </div>

      {NAV.map((nav) => {
        const active = nav.href === "/admin" ? pathname === "/admin" : pathname.startsWith(nav.href);
        const showBadge = nav.badgeKey === "pending" && pendingCount > 0;
        return (
          <Link key={nav.href} href={nav.href} className={active ? ACTIVE : INACTIVE}>
            <span>{nav.label}</span>
            {showBadge ? (
              <span className="min-w-4 rounded-pill bg-danger px-[7px] py-[2px] text-center text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            ) : null}
          </Link>
        );
      })}

      <div className="mt-auto flex flex-col gap-3 px-2.5 pb-1 pt-3.5">
        <div className="text-[11px] leading-relaxed text-fg30">
          사이트와 동일한 데이터베이스를 사용해요. 여기서 저장하면 사이트에 즉시 반영돼요.
        </div>
        <div className="flex flex-col gap-1 border-t border-line6 pt-3">
          <div className="truncate text-[11px] text-fg55">{user.email}</div>
          <div className="text-[10px] text-fg35">
            역할 · {user.role === "ADMIN" ? "관리자(ADMIN)" : "에디터(EDITOR)"}
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-1 w-fit cursor-pointer rounded-lg border border-line12 bg-surface4 px-2.5 py-1.5 text-[11px] text-fg70"
          >
            로그아웃
          </button>
        </div>
      </div>
    </aside>
  );
}
