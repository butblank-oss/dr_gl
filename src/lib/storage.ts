import "server-only";

import { createHash, createHmac, randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/avif", "avif"],
]);

export class UploadError extends Error {}

export type StoredFile = { url: string; key: string };

export type StorageDriver = "local" | "db" | "s3";

/**
 * 스토리지 드라이버 결정.
 * 명시적으로 지정하지 않았고 서버리스(Vercel)에서 돌고 있으면 디스크에 쓸 수 없으므로 db 를 쓴다.
 */
export function storageDriver(): StorageDriver {
  const explicit = process.env.STORAGE_DRIVER;
  if (explicit === "local" || explicit === "db" || explicit === "s3") return explicit;
  return process.env.VERCEL ? "db" : "local";
}

/**
 * 포스터/배경 이미지 저장.
 * (프로토타입의 <image-slot> sidecar 방식을 완전히 대체하는 지점)
 */
export async function storeImage(file: File, prefix = "poster"): Promise<StoredFile> {
  const ext = ALLOWED.get(file.type);
  if (!ext) throw new UploadError("JPG, PNG, WEBP, GIF, AVIF 이미지만 올릴 수 있어요.");
  if (file.size <= 0) throw new UploadError("빈 파일이에요.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("이미지는 5MB까지 올릴 수 있어요.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `${prefix}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;

  switch (storageDriver()) {
    case "s3":
      return putToS3(key, buffer, file.type);
    case "db":
      return putToDatabase(key, buffer, file.type);
    default:
      return putToLocalDisk(key, buffer);
  }
}

/** Buffer 는 풀에서 잘라 쓴 뷰라서, 그대로 넘기면 옆 데이터까지 딸려간다. 항상 복사본을 만든다. */
function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

async function putToDatabase(key: string, buffer: Buffer, contentType: string): Promise<StoredFile> {
  await prisma.mediaFile.create({
    data: {
      key,
      contentType,
      size: buffer.byteLength,
      data: new Uint8Array(toArrayBuffer(buffer)),
    },
  });
  return { url: `/media/${key}`, key };
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

async function putToLocalDisk(key: string, buffer: Buffer): Promise<StoredFile> {
  const target = path.join(uploadRoot(), key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
  return { url: `/media/${key}`, key };
}

/* ---------- S3 (AWS SigV4, S3 호환 스토리지 모두 지원) ---------- */

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

async function putToS3(key: string, body: Buffer, contentType: string): Promise<StoredFile> {
  const bucket = requireEnv("S3_BUCKET");
  const region = process.env.S3_REGION || "us-east-1";
  const accessKeyId = requireEnv("S3_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("S3_SECRET_ACCESS_KEY");
  const endpoint = process.env.S3_ENDPOINT || `https://s3.${region}.amazonaws.com`;

  const url = new URL(`${endpoint.replace(/\/$/, "")}/${bucket}/${key}`);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);

  const headers: Record<string, string> = {
    host: url.host,
    "content-type": contentType,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((h) => `${h}:${headers[h]}\n`)
    .join("");

  const canonicalRequest = [
    "PUT",
    url.pathname,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");

  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), "s3"), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      ...headers,
      Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body: new Uint8Array(body),
  });

  if (!response.ok) {
    throw new UploadError(`이미지 업로드에 실패했어요. (S3 ${response.status})`);
  }

  const publicBase = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  return { url: publicBase ? `${publicBase}/${key}` : url.toString(), key };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new UploadError(`스토리지 설정(${name})이 비어 있어요.`);
  return value;
}
