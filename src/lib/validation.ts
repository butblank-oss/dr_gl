import { z } from "zod";
import { COUNTRIES, CREATOR_LABELS, PLATFORM_TYPES } from "@/lib/types";

export const platformSchema = z.object({
  name: z.string().trim().min(1, "플랫폼 이름을 입력해주세요."),
  type: z.enum(PLATFORM_TYPES),
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

export const submissionInputSchema = z.object({
  title: z.string().trim().min(1, "제목과 링크는 꼭 입력해주세요."),
  category: z.string().trim().min(1, "형식을 선택해주세요."),
  country: z.enum(COUNTRIES).default("국내"),
  juice: z.boolean().default(false),
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
