import "server-only";

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

/**
 * 읽기 전용 미디어 저장소.
 *
 * 포스터·배경은 이제 주소로만 등록한다(이미지를 우리 서버에 복제하지 않기 위해서).
 * 그래서 쓰기 경로는 없고, 업로드를 없애기 전에 올려둔 이미지들을 계속 서빙하는 일만 남았다.
 */
export type StorageDriver = "local" | "db";

/**
 * 스토리지 드라이버 결정.
 * 명시적으로 지정하지 않았고 서버리스(Vercel)에서 돌고 있으면 디스크를 쓸 수 없으므로 db 를 쓴다.
 */
export function storageDriver(): StorageDriver {
  const explicit = process.env.STORAGE_DRIVER;
  if (explicit === "local" || explicit === "db") return explicit;
  return process.env.VERCEL ? "db" : "local";
}

/** Buffer 는 풀에서 잘라 쓴 뷰라서, 그대로 넘기면 옆 데이터까지 딸려간다. 항상 복사본을 만든다. */
function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

export type LoadedMedia = { body: ArrayBuffer; contentType: string; size: number };

/** /media 라우트가 쓰는 조회 — 현재 드라이버를 먼저 보고, 없으면 다른 쪽도 확인한다. */
export async function loadMedia(key: string): Promise<LoadedMedia | null> {
  const driver = storageDriver();
  const order = driver === "db" ? ["db", "disk"] : ["disk", "db"];
  for (const source of order) {
    const found = source === "db" ? await loadFromDatabase(key) : await loadFromDisk(key);
    if (found) return found;
  }
  return null;
}

async function loadFromDatabase(key: string): Promise<LoadedMedia | null> {
  const row = await prisma.mediaFile.findUnique({ where: { key } });
  if (!row) return null;
  return {
    body: toArrayBuffer(Buffer.from(row.data)),
    contentType: row.contentType,
    size: row.size,
  };
}

async function loadFromDisk(key: string): Promise<LoadedMedia | null> {
  const root = uploadRoot();
  const target = path.join(root, key);
  if (!target.startsWith(root + path.sep)) return null;

  const contentType = MEDIA_CONTENT_TYPES[path.extname(target).toLowerCase()];
  if (!contentType) return null;

  try {
    const info = await stat(target);
    if (!info.isFile()) return null;
    const file = await readFile(target);
    return { body: toArrayBuffer(file), contentType, size: info.size };
  } catch {
    return null;
  }
}

/** 로컬 업로드 디렉터리. public/ 이 아니라 별도 폴더에 두고 /media 라우트로 서빙한다. */
export function uploadRoot(): string {
  return process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(process.cwd(), "uploads");
}

export const MEDIA_CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};
