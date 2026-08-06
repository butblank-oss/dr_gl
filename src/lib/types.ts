export const COUNTRIES = ["국내", "해외"] as const;
export const COUNTRY_FILTERS = ["전체", "국내", "해외"] as const;
export const CREATOR_LABELS = ["감독", "연출", "작가"] as const;

export const SUBMISSION_STATUSES = ["pending", "approved", "rejected"] as const;
export const COMMENT_STATUSES = ["visible", "hidden"] as const;
export const ADMIN_ROLES = ["ADMIN", "EDITOR"] as const;

export type Country = (typeof COUNTRIES)[number];
export type CreatorLabel = (typeof CREATOR_LABELS)[number];
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];
export type CommentStatus = (typeof COMMENT_STATUSES)[number];
export type AdminRole = (typeof ADMIN_ROLES)[number];

/**
 * 시청·감상처 한 곳.
 * 유료/무료 구분은 두지 않는다 — 플랫폼 정책이 수시로 바뀌어 우리가 정확히 유지할 수 없고,
 * 잘못된 안내가 없느니만 못하다. 들어가서 직접 확인하는 편이 낫다.
 */
export type Platform = {
  name: string;
  url: string;
};

export type ContentDTO = {
  id: number;
  title: string;
  /** 영어(원어) 제목. 해외 검색·영어 화면용. 없으면 빈 문자열. */
  titleEn: string;
  category: string;
  country: string;
  countryDetail: string;
  year: number;
  creatorLabel: string;
  creatorName: string;
  leads: string[];
  tags: string[];
  juice: boolean;
  poster: boolean;
  posterUrl: string | null;
  backdropUrl: string | null;
  synopsis: string;
  platforms: Platform[];
  createdAt: string;
};

export type CategoryDTO = {
  id: number;
  name: string;
  sortOrder: number;
  count?: number;
};

export type SubmissionDTO = {
  id: number;
  title: string;
  category: string;
  country: string;
  juice: boolean;
  platform: string;
  url: string;
  note: string;
  contact: string;
  status: SubmissionStatus;
  rejectReason: string;
  rejectNote: string;
  contentId: number | null;
  createdAt: string;
};

/**
 * 반려 사유. 나중에 "무엇 때문에 많이 반려됐는지"를 세어 제보 폼 안내를 고치려는 목적이라,
 * 자유 입력이 아니라 코드로 남긴다. '기타'는 반드시 설명을 함께 받는다.
 */
export const REJECT_REASONS = [
  { code: "duplicate", label: "중복 제보", desc: "이미 등록돼 있는 작품이에요." },
  { code: "unverifiable", label: "확인 불가", desc: "작품이 실제로 있는지 확인할 수 없었어요." },
  { code: "not_gl", label: "GL 작품 아님", desc: "여성 서사·백합 요소를 찾지 못했어요." },
  { code: "adult", label: "성인물", desc: "성인 등급 콘텐츠는 다루지 않아요." },
  { code: "bad_link", label: "링크 문제", desc: "링크가 열리지 않거나 정식 감상처가 아니에요." },
  { code: "illegal", label: "불법 유통", desc: "권리 없이 올라온 곳으로 보여요." },
  { code: "spam", label: "장난·광고", desc: "작품 제보로 보기 어려운 내용이에요." },
  { code: "other", label: "기타", desc: "사유를 직접 적어주세요." },
] as const;

export type RejectReasonCode = (typeof REJECT_REASONS)[number]["code"];
export const REJECT_REASON_CODES = REJECT_REASONS.map((r) => r.code) as unknown as [
  RejectReasonCode,
  ...RejectReasonCode[],
];
export const REJECT_REASON_LABELS: Record<string, string> = Object.fromEntries(
  REJECT_REASONS.map((r) => [r.code, r.label]),
);

export type CommentDTO = {
  id: number;
  itemId: number;
  text: string;
  status: CommentStatus;
  createdAt: string;
};

export type AdminCommentDTO = CommentDTO & { itemTitle: string };

export type HomeRowDTO = {
  id: number;
  title: string;
  sortOrder: number;
  isActive: boolean;
  items: ContentDTO[];
};

export type AdminUserDTO = {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  ADMIN: "슈퍼관리자",
  EDITOR: "운영자",
};

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
};

/** 제보 상태 <-> 어드민 필터 탭 라벨 */
export const SUBMISSION_FILTER_LABELS = ["대기중", "승인됨", "반려됨", "전체"] as const;
export const SUBMISSION_STATUS_TEXT: Record<SubmissionStatus, string> = {
  pending: "대기중",
  approved: "승인됨",
  rejected: "반려됨",
};
export const SUBMISSION_FILTER_TO_STATUS: Record<string, SubmissionStatus | undefined> = {
  대기중: "pending",
  승인됨: "approved",
  반려됨: "rejected",
  전체: undefined,
};

export const COMMENT_FILTER_LABELS = ["전체", "노출중", "숨김"] as const;
export const COMMENT_FILTER_TO_STATUS: Record<string, CommentStatus | undefined> = {
  전체: undefined,
  노출중: "visible",
  숨김: "hidden",
};

/* ---------- 약관·정책 문서 ---------- */

export type LegalVersionDTO = {
  id: number;
  version: number;
  body: string;
  effectiveDate: string;
  changeNote: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdByName: string;
  createdAt: string;
};

export type LegalDocumentDTO = {
  id: number;
  slug: string;
  title: string;
  versions: LegalVersionDTO[];
};

export const LEGAL_SLUGS = ["terms", "privacy"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];
