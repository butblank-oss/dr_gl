export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** 어드민 화면에서 쓰는 얇은 fetch 래퍼 — 서버 에러 메시지를 그대로 토스트/인라인에 쓴다. */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers:
        init?.body instanceof FormData
          ? init?.headers
          : { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError("네트워크 오류로 요청을 보내지 못했어요.", 0);
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(data.error ?? "요청을 처리하지 못했어요.", res.status);
  }
  return data as T;
}
