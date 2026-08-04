import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** 모든 라우트 핸들러의 공통 에러 처리 — 인증/검증/예상치 못한 에러를 일관된 JSON으로. */
export async function handle<T>(fn: () => Promise<T>) {
  try {
    return (await fn()) as unknown as NextResponse;
  } catch (error) {
    if (error instanceof AuthError) return fail(error.message, error.status);
    if (error instanceof ZodError) {
      const first = error.issues[0];
      return fail(first?.message ?? "입력값을 확인해주세요.", 422, {
        issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }
    console.error("[api]", error);
    return fail("요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.", 500);
  }
}

export function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AuthError("잘못된 요청이에요.", 400);
  }
  return id;
}

/** 프록시 뒤에서도 최대한 정확한 클라이언트 IP를 얻는다. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
