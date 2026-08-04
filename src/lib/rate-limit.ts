import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

/** 원본 IP는 저장하지 않고 시크릿과 함께 해싱해 보관한다. */
export function hashIp(ip: string): string {
  const salt = process.env.AUTH_SECRET ?? "drgl";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

/**
 * 비로그인 한줄평 스팸 방지 — 같은 IP가 윈도우 안에 남길 수 있는 건수를 서버에서 제한한다.
 * 저장소가 DB라 인스턴스가 여러 대여도 동일하게 동작한다.
 */
export async function checkCommentRateLimit(ipHash: string): Promise<RateLimitResult> {
  const max = Number(process.env.COMMENT_RATE_LIMIT_MAX ?? 5);
  const windowMinutes = Number(process.env.COMMENT_RATE_LIMIT_WINDOW_MINUTES ?? 10);
  if (!Number.isFinite(max) || max <= 0) return { allowed: true, retryAfterSeconds: 0 };

  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const recent = await prisma.comment.findMany({
    where: { ipHash, createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  if (recent.length < max) return { allowed: true, retryAfterSeconds: 0 };

  const oldest = recent[0]!.createdAt.getTime();
  const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMinutes * 60 * 1000 - Date.now()) / 1000));
  return { allowed: false, retryAfterSeconds };
}
