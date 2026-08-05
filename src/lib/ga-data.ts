import "server-only";

import { SignJWT, importPKCS8 } from "jose";
import { prisma } from "@/lib/prisma";

/**
 * 구글 애널리틱스(GA4) Data API 얇은 클라이언트.
 *
 * 서비스 계정 키로 직접 토큰을 발급받아 호출한다. 외부 SDK를 붙이지 않은 이유는
 * 필요한 게 "토큰 하나 받아서 runReport 호출" 뿐이고, jose 는 이미 세션 서명에 쓰고 있어서다.
 *
 * 자격증명은 두 곳에서 읽는다. 어드민에 저장한 값이 있으면 그게 우선이다.
 *   1) 어드민 → 방문 분석 → 연결 설정 (DB. 재배포 없이 즉시 반영)
 *   2) 환경변수 GA_PROPERTY_ID / GA_SERVICE_ACCOUNT_KEY / GA_SERVICE_ACCOUNT_EMAIL
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const PEM_HEADER = "-----BEGIN PRIVATE KEY-----";

/** DB에 자격증명을 담아두는 자리 */
export const GA_SETTING_KEY = "gaServiceAccount";
export const GA_PROPERTY_SETTING_KEY = "gaPropertyId";

export type GaCredentials = {
  propertyId: string;
  clientEmail: string;
  privateKey: string;
};

/** 값이 어떤 모양으로 들어와도 최대한 알아서 읽는다. */
export function parseCredentials(raw: string, fallbackEmail = ""): { clientEmail: string; privateKey: string } {
  const value = raw.trim();
  if (!value) return { clientEmail: fallbackEmail, privateKey: "" };

  // 서비스 계정 JSON 파일을 통째로 넣은 경우 — 이메일까지 여기서 얻는다.
  if (value.startsWith("{")) {
    try {
      const parsed = JSON.parse(value) as { private_key?: string; client_email?: string };
      return {
        clientEmail: parsed.client_email?.trim() || fallbackEmail,
        privateKey: (parsed.private_key ?? "").replace(/\\n/g, "\n").trim(),
      };
    } catch {
      return { clientEmail: fallbackEmail, privateKey: "" };
    }
  }

  return {
    clientEmail: fallbackEmail,
    privateKey: value
      .replace(/^["']|["']$/g, "") // 양끝 따옴표
      .replace(/\\n/g, "\n") // \n 문자열 → 실제 줄바꿈
      .trim(),
  };
}

/** 저장된 값이 실제로 쓸 수 있는 형태인지 */
export function credentialsLookValid(credentials: { clientEmail: string; privateKey: string }): boolean {
  return credentials.privateKey.includes(PEM_HEADER) && credentials.clientEmail.includes("@");
}

async function loadCredentials(): Promise<GaCredentials> {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: [GA_SETTING_KEY, GA_PROPERTY_SETTING_KEY] } },
  });
  const stored = new Map(rows.map((row) => [row.key, row.value]));

  const rawKey = stored.get(GA_SETTING_KEY) ?? process.env.GA_SERVICE_ACCOUNT_KEY ?? "";
  const fallbackEmail = (process.env.GA_SERVICE_ACCOUNT_EMAIL ?? "").trim();
  const { clientEmail, privateKey } = parseCredentials(rawKey, fallbackEmail);

  const propertyId = (stored.get(GA_PROPERTY_SETTING_KEY) ?? process.env.GA_PROPERTY_ID ?? "").replace(
    /\D/g,
    "",
  );

  return { propertyId, clientEmail, privateKey };
}

/** 화면에 보여줄 연결 상태. 키 내용은 절대 밖으로 내보내지 않는다. */
export type GaStatus = {
  ready: boolean;
  propertyId: string;
  clientEmail: string;
  /** 무엇이 잘못됐는지 사람이 읽을 수 있는 설명 */
  problem: string;
  /** 값이 이상할 때만 채운다. 키 내용이 아니라 형태만 알려준다. */
  hint: string;
  /** 환경변수로 들어온 값인지 (어드민에서 지워도 남는 값인지) */
  fromEnv: boolean;
};

export async function getGaStatus(): Promise<GaStatus> {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: [GA_SETTING_KEY, GA_PROPERTY_SETTING_KEY] } },
    select: { key: true },
  });
  const savedInAdmin = rows.some((row) => row.key === GA_SETTING_KEY);
  const credentials = await loadCredentials();

  const base = {
    propertyId: credentials.propertyId,
    clientEmail: credentials.clientEmail,
    fromEnv: !savedInAdmin,
  };

  if (!credentials.privateKey && !credentials.propertyId) {
    return { ...base, ready: false, problem: "", hint: "" };
  }
  if (!credentials.propertyId) {
    return {
      ...base,
      ready: false,
      problem: "속성 ID가 비어 있어요. GA 속성 ID(숫자)를 넣어주세요.",
      hint: "",
    };
  }
  if (!credentials.privateKey) {
    const raw = (process.env.GA_SERVICE_ACCOUNT_KEY ?? "").trim();
    return {
      ...base,
      ready: false,
      problem: "서비스 계정 키를 읽지 못했어요. JSON 파일 내용을 통째로 붙여넣어 주세요.",
      hint: raw.startsWith("{") ? "붙여넣은 값이 JSON이긴 한데 private_key 항목이 없어요." : "",
    };
  }
  if (!credentials.privateKey.includes(PEM_HEADER)) {
    return {
      ...base,
      ready: false,
      problem: `키 값이 비공개 키 형태가 아니에요. "${PEM_HEADER}" 로 시작해야 합니다.`,
      hint: describe(credentials.privateKey),
    };
  }
  if (!credentials.clientEmail) {
    return {
      ...base,
      ready: false,
      problem: "서비스 계정 이메일을 찾지 못했어요. JSON 파일 전체를 붙여넣으면 자동으로 읽습니다.",
      hint: "",
    };
  }
  return { ...base, ready: true, problem: "", hint: "" };
}

/** 값의 내용이 아니라 "생김새"만 알려준다 — 무엇이 잘못 붙여넣어졌는지 판단용. */
function describe(value: string): string {
  const first = value.slice(0, 1);
  const kind = first === "{" ? "JSON({)" : first === "<" ? "HTML 태그(<)" : `'${first}' 로 시작`;
  return `지금 값: ${value.length}자, ${kind}, 줄 수 ${value.split("\n").length}`;
}

let cachedToken: { value: string; expiresAt: number; email: string } | null = null;

async function getAccessToken(credentials: GaCredentials): Promise<string> {
  if (
    cachedToken &&
    cachedToken.email === credentials.clientEmail &&
    cachedToken.expiresAt > Date.now() + 60_000
  ) {
    return cachedToken.value;
  }

  const key = await importPKCS8(credentials.privateKey, "RS256").catch(() => {
    throw new Error(
      "비공개 키를 읽지 못했어요. 중간이 잘렸을 수 있어요. JSON 파일 내용을 통째로 다시 붙여넣어 주세요.",
    );
  });

  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(credentials.clientEmail)
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
    throw new Error(
      `구글 인증에 실패했어요 (${res.status}). 서비스 계정 키가 맞는지, 클라우드 프로젝트에서 Google Analytics Data API 를 사용 설정했는지 확인해주세요.`,
    );
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    email: credentials.clientEmail,
  };
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
  const credentials = await loadCredentials();
  if (!credentialsLookValid(credentials) || !credentials.propertyId) {
    const status = await getGaStatus();
    throw new Error(status.problem || "GA 연결 설정이 필요해요.");
  }

  const token = await getAccessToken(credentials);
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${credentials.propertyId}:runReport`,
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
        `GA 속성(${credentials.propertyId})에 접근 권한이 없어요. 애널리틱스 → 관리 → 속성 액세스 관리에서 ${credentials.clientEmail} 을 '뷰어'로 추가했는지 확인해주세요.`,
      );
    }
    if (res.status === 404) {
      throw new Error(`속성 ID ${credentials.propertyId} 를 찾지 못했어요. 속성 ID(숫자)가 맞는지 확인해주세요.`);
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
