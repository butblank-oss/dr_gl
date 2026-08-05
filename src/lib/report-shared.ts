/** 리포트 종류 — 서버(생성)와 화면(선택 버튼) 양쪽에서 함께 쓴다. */

export const REPORT_KINDS = ["daily", "weekly", "monthly"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

export const REPORT_LABELS: Record<ReportKind, string> = {
  daily: "일별",
  weekly: "주별",
  monthly: "월별",
};

/** 방문 분석 탭과 리포트 문단의 대응 */
export type ReportSections = {
  summary: string[];
  content: string[];
  conversion: string[];
  audience: string[];
  behavior: string[];
};
