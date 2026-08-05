import { z } from "zod";
import { ADMIN_ROLES, COUNTRIES, CREATOR_LABELS } from "@/lib/types";

export const platformSchema = z.object({
  name: z.string().trim().min(1, "플랫폼 이름을 입력해주세요."),
  url: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https?:\/\//i.test(v), "링크는 http(s):// 로 시작해야 해요.")
    .default(""),
});

const currentYear = new Date().getFullYear();

export const contentInputSchema = z.object({
  title: z.string().trim().min(1, "제목과 카테고리는 필수예요."),
  category: z.string().trim().min(1, "제목과 카테고리는 필수예요."),
  country: z.enum(COUNTRIES).default("국내"),
  countryDetail: z.string().trim().default(""),
  year: z.coerce.number().int().min(1800).max(currentYear + 10).catch(currentYear),
  creatorLabel: z.enum(CREATOR_LABELS).default("감독"),
  creatorName: z.string().trim().default(""),
  leads: z.array(z.string().trim().min(1)).default([]),
  tags: z.array(z.string().trim().min(1)).default([]),
  juice: z.boolean().default(false),
  poster: z.boolean().default(true),
  posterUrl: z.string().trim().nullable().default(null),
  backdropUrl: z.string().trim().nullable().default(null),
  synopsis: z.string().default(""),
  platforms: z.array(platformSchema).default([]),
});

export type ContentInput = z.input<typeof contentInputSchema>;

/**
 * 콘텐츠 저장 + 홈 큐레이션 배치를 한 번에 받는다.
 * homeRowIds 를 아예 보내지 않으면(undefined) 기존 배치는 건드리지 않는다.
 * 빈 배열을 보내면 "모든 행에서 빼기"를 뜻한다.
 */
export const contentWithRowsSchema = contentInputSchema.extend({
  homeRowIds: z.array(z.coerce.number().int().positive()).optional(),
});

export const submissionInputSchema = z.object({
  title: z.string().trim().min(1, "제목과 링크는 꼭 입력해주세요."),
  category: z.string().trim().min(1, "형식을 선택해주세요."),
  country: z.enum(COUNTRIES).default("국내"),
  juice: z.boolean().default(false),
  platform: z.string().trim().max(40).default(""),
  url: z
    .string()
    .trim()
    .min(1, "제목과 링크는 꼭 입력해주세요.")
    .refine((v) => /^https?:\/\//i.test(v), "시청/감상 링크는 http(s):// 로 시작해야 해요."),
  note: z.string().trim().max(2000).default(""),
  contact: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "이메일 형식을 확인해주세요.")
    .default(""),
});

export const commentInputSchema = z.object({
  itemId: z.coerce.number().int().positive(),
  text: z.string().trim().min(1, "한줄평을 입력해주세요.").max(300, "한줄평은 300자까지 쓸 수 있어요."),
});

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "카테고리 이름을 입력해주세요.").max(30),
});

export const categoryUpdateSchema = z.object({
  name: z.string().trim().min(1, "카테고리 이름을 입력해주세요.").max(30).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, "이메일을 입력해주세요."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

export const notifySignupSchema = z.object({
  email: z
    .string()
    .trim()
    .refine((v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "이메일 형식을 확인해주세요."),
});

export const homeRowInputSchema = z.object({
  title: z.string().trim().min(1, "행 제목을 입력해주세요.").max(60),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
  contentIds: z.array(z.coerce.number().int().positive()).optional(),
});

/** 쉼표로 구분된 입력을 배열로. (어드민 모달의 출연·태그 필드) */
export function splitCommaList(raw: string): string[] {
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

/* ---------- 운영자 계정 ---------- */

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .refine((v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "이메일 형식을 확인해주세요.");

const passwordField = z
  .string()
  .min(8, "비밀번호는 8자 이상으로 정해주세요.")
  .max(72, "비밀번호가 너무 길어요.");

export const adminCreateSchema = z.object({
  email: emailField,
  name: z.string().trim().max(30).default(""),
  password: passwordField,
  role: z.enum(ADMIN_ROLES).default("EDITOR"),
});

export const adminUpdateSchema = z.object({
  name: z.string().trim().max(30).optional(),
  role: z.enum(ADMIN_ROLES).optional(),
  isActive: z.boolean().optional(),
  password: passwordField.optional(),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "현재 비밀번호를 입력해주세요."),
  newPassword: passwordField,
});

/* ---------- 약관·정책 문서 ---------- */

export const legalVersionCreateSchema = z.object({
  body: z.string().trim().min(1, "본문을 입력해주세요."),
  /** YYYY-MM-DD */
  effectiveDate: z
    .string()
    .trim()
    .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v), "시행일을 YYYY-MM-DD 형식으로 입력해주세요."),
  changeNote: z.string().trim().max(200).default(""),
  /** 저장과 동시에 발행할지 */
  publish: z.boolean().default(false),
});

export const legalVersionUpdateSchema = z.object({
  isPublished: z.literal(true),
});
