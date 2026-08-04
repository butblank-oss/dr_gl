import "server-only";

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth-shared";
import { prisma } from "@/lib/prisma";
import type { AdminRole, SessionUser } from "@/lib/types";

export { SESSION_COOKIE };
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12시간

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET 환경변수가 설정되지 않았어요.");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function readSessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    if (!Number.isFinite(id)) return null;
    return {
      id,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: (payload.role === "ADMIN" ? "ADMIN" : "EDITOR") as AdminRole,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await createSessionToken(user);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** 쿠키의 세션을 읽어 현재 운영자를 돌려준다. 없으면 null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await readSessionToken(token);
  if (!session) return null;

  // 토큰 발급 이후 계정이 비활성화·삭제되었을 수 있으므로 DB로 재확인한다.
  const user = await prisma.adminUser.findUnique({ where: { id: session.id } });
  if (!user || !user.isActive) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: (user.role === "ADMIN" ? "ADMIN" : "EDITOR") as AdminRole,
  };
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** API 라우트용 가드. 로그인 필수. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("로그인이 필요해요.", 401);
  return user;
}

/** 역할 기반 권한 가드. ADMIN 전용 동작에 사용. */
export async function requireRole(...roles: AdminRole[]): Promise<SessionUser> {
  const user = await requireAdmin();
  if (!roles.includes(user.role)) {
    throw new AuthError("이 작업을 수행할 권한이 없어요.", 403);
  }
  return user;
}
