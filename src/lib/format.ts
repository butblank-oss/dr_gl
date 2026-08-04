const pad = (n: number) => String(n).padStart(2, "0");

/** 한줄평 리스트에 쓰는 작성일 — YYYY.MM.DD */
export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

/** 어드민 한줄평 검수의 작성 시각 — YYYY.MM.DD HH:mm */
export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function leadsText(leads: string[]): string {
  return leads.join(", ");
}
