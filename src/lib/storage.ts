import "server-only";

import { createHash, createHmac, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

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

/**
 * 포스터/배경 이미지 저장.
 * STORAGE_DRIVER=local 이면 public/uploads 에, s3 이면 S3 호환 버킷에 올린다.
 * (프로토타입의 <image-slot> sidecar 방식을 완전히 대체하는 지점)
 */
export async function storeImage(file: File, prefix = "poster"): Promise<StoredFile> {
  const ext = ALLOWED.get(file.type);
  if (!ext) throw new UploadError("JPG, PNG, WEBP, GIF, AVIF 이미지만 올릴 수 있어요.");
  if (file.size <= 0) throw new UploadError("빈 파일이에요.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("이미지는 5MB까지 올릴 수 있어요.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = `${prefix}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;

  if ((process.env.STORAGE_DRIVER ?? "local") === "s3") {
    return putToS3(key, buffer, file.type);
  }
  return putToLocalDisk(key, buffer);
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
