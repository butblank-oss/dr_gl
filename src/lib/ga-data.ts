import "server-only";

import { SignJWT, importPKCS8 } from "jose";

/**
 * 구글 애널리틱스(GA4) Data API 얇은 클라이언트.
 *
 * 서비스 계정 키로 직접 토큰을 발급받아 호출한다. 외부 SDK를 붙이지 않은 이유는
 * 필요한 게 "토큰 하나 받아서 runReport 호출" 뿐이고, jose 는 이미 세션 서명에 쓰고 있어서다.
 *
 * 필요한 환경변수
 *   GA_PROPERTY_ID              GA4 속성 ID (숫자만. 측정 ID G-... 아님)
 *   GA_SERVICE_ACCOUNT_EMAIL    서비스 계정 이메일
 *   GA_SERVICE_ACCOUNT_KEY      서비스 계정 비공개 키 (-----BEGIN PRIVATE KEY----- ...)
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

export const GA_PROPERTY_ID = process.env.GA_PROPERTY_ID?.replace(/\D/g, "") ?? "";
const CLIENT_EMAIL = process.env.GA_SERVICE_ACCOUNT_EMAIL ?? "";
// 환경변수 한 줄에 넣으려고 줄바꿈을 \n 으로 바꿔 붙여넣는 경우가 많아 되돌려준다.
const PRIVATE_KEY = (process.env.GA_SERVICE_ACCOUNT_KEY ?? "").replace(/\\n/g, "\n");

export function isGaConfigured(): boolean {
  return Boolean(GA_PROPERTY_ID && CLIENT_EMAIL && PRIVATE_KEY);
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const key = await importPKCS8(PRIVATE_KEY, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(CLIENT_EMAIL)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`구글 인증에 실패했어요 (${res.status}). 서비스 계정 키를 확인해주세요.`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

type RunReportRequest = {
  dateRanges: { startDate: string; endDate: string }[];
  dimensions?: { name: string }[];
  metrics?: { name: string }[];
  dimensionFilter?: unknown;
  orderBys?: unknown[];
  limit?: number;
  keepEmptyRows?: boolean;
};

type RunReportResponse = {
  rows?: { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] }[];
  rowCount?: number;
};

/** 표 하나 = 요청 하나. 실패하면 화면 전체가 죽지 않도록 호출한 쪽에서 처리한다. */
export async function runReport(body: RunReportRequest): Promise<RunReportResponse> {
  const token = await getAccessToken();
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${GA_PROPERTY_ID}:runReport`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // 지표는 실시간이 아니어도 되므로 짧게 캐시해 어드민을 열 때마다 API를 두드리지 않는다.
      next: { revalidate: 300 },
    },
  );
  if (!res.ok) {
    const detail = await res.text();
    if (res.status === 403) {
      throw new Error(
        "GA 속성에 접근 권한이 없어요. 서비스 계정 이메일을 GA 속성의 '뷰어'로 추가했는지 확인해주세요.",
      );
    }
    throw new Error(`GA 데이터를 불러오지 못했어요 (${res.status}). ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as RunReportResponse;
}

/** 행을 [차원값들, 숫자] 형태로 다루기 쉽게 편다. */
export type ReportRow = { keys: string[]; values: number[] };

export function toRows(response: RunReportResponse): ReportRow[] {
  return (response.rows ?? []).map((row) => ({
    keys: (row.dimensionValues ?? []).map((d) => d.value),
    values: (row.metricValues ?? []).map((m) => Number(m.value) || 0),
  }));
}

/** GA 맞춤 측정기준은 이벤트 파라미터 이름 앞에 customEvent: 를 붙여 부른다. */
export function customDimension(name: string): { name: string } {
  return { name: `customEvent:${name}` };
}
