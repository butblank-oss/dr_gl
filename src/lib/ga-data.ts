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

const PEM_HEADER = "-----BEGIN PRIVATE KEY-----";

/**
 * 서비스 계정 자격증명을 최대한 관대하게 읽는다.
 *
 * 사람이 손으로 옮기는 값이라 형태가 제각각이다. 아래를 전부 받아준다.
 *   - 다운로드한 JSON 파일 내용을 통째로 붙여넣은 경우 (가장 편한 방법)
 *   - private_key 값만 꺼낸 경우 (줄바꿈이 \n 문자열로 남아 있어도 됨)
 *   - 값 양끝에 따옴표가 딸려온 경우
 */
function readCredentials(): { email: string; privateKey: string } {
  const rawKey = (process.env.GA_SERVICE_ACCOUNT_KEY ?? "").trim();
  let email = (process.env.GA_SERVICE_ACCOUNT_EMAIL ?? "").trim();

  // JSON 파일을 통째로 넣은 경우 — 이메일까지 여기서 얻는다.
  if (rawKey.startsWith("{")) {
    try {
      const parsed = JSON.parse(rawKey) as { private_key?: string; client_email?: string };
      if (parsed.client_email) email = parsed.client_email;
      return { email, privateKey: (parsed.private_key ?? "").replace(/\\n/g, "\n").trim() };
    } catch {
      return { email, privateKey: "" };
    }
  }

  const privateKey = rawKey
    .replace(/^["']|["']$/g, "") // 양끝 따옴표
    .replace(/\\n/g, "\n") // \n 문자열 → 실제 줄바꿈
    .trim();

  return { email, privateKey };
}

const { email: CLIENT_EMAIL, privateKey: PRIVATE_KEY } = readCredentials();

export function isGaConfigured(): boolean {
  return Boolean(GA_PROPERTY_ID && (CLIENT_EMAIL || PRIVATE_KEY));
}

/** 무엇이 빠졌는지 사람이 읽을 수 있게 알려준다. 키 내용 자체는 절대 노출하지 않는다. */
function credentialProblem(): string {
  if (!GA_PROPERTY_ID) return "GA_PROPERTY_ID 가 비어 있어요. GA 속성 ID(숫자)를 넣어주세요.";
  if (!PRIVATE_KEY) {
    return "GA_SERVICE_ACCOUNT_KEY 가 비어 있어요. 다운로드한 서비스 계정 JSON 파일의 내용을 통째로 붙여넣으면 됩니다.";
  }
  if (!PRIVATE_KEY.includes(PEM_HEADER)) {
    return `GA_SERVICE_ACCOUNT_KEY 값이 비공개 키 형태가 아니에요. "${PEM_HEADER}" 로 시작해야 합니다. 가장 확실한 방법은 다운로드한 JSON 파일을 텍스트편집기로 열어 { 부터 } 까지 전부 복사해 이 값에 붙여넣는 거예요.`;
  }
  if (!CLIENT_EMAIL) {
    return "GA_SERVICE_ACCOUNT_EMAIL 이 비어 있어요. ...gserviceaccount.com 주소를 넣거나, JSON 파일 전체를 GA_SERVICE_ACCOUNT_KEY 에 붙여넣으면 자동으로 읽습니다.";
  }
  return "";
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  // 값이 잘못 들어간 경우, 라이브러리의 영어 오류 대신 무엇을 고쳐야 하는지 알려준다.
  const problem = credentialProblem();
  if (problem) throw new Error(problem);

  const key = await importPKCS8(PRIVATE_KEY, "RS256").catch(() => {
    throw new Error(
      "비공개 키를 읽지 못했어요. 중간이 잘렸을 수 있어요. JSON 파일 내용을 통째로 GA_SERVICE_ACCOUNT_KEY 에 붙여넣어 보세요.",
    );
  });
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
