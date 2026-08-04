import type {
  AdminUser as AdminUserRow,
  Category as CategoryRow,
  Comment as CommentRow,
  Content as ContentRow,
  Submission as SubmissionRow,
} from "@prisma/client";
import type {
  AdminRole,
  AdminUserDTO,
  CategoryDTO,
  CommentDTO,
  CommentStatus,
  ContentDTO,
  Platform,
  SubmissionDTO,
  SubmissionStatus,
} from "@/lib/types";
import { PLATFORM_TYPES } from "@/lib/types";

export function toPlatforms(raw: unknown): Platform[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name : "";
    if (!name.trim()) return [];
    const type = PLATFORM_TYPES.includes(record.type as Platform["type"])
      ? (record.type as Platform["type"])
      : "유료";
    const url = typeof record.url === "string" ? record.url : "";
    return [{ name, type, url }];
  });
}

export function serializeContent(row: ContentRow): ContentDTO {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    country: row.country,
    countryDetail: row.countryDetail,
    year: row.year,
    creatorLabel: row.creatorLabel,
    creatorName: row.creatorName,
    leads: row.leads,
    tags: row.tags,
    juice: row.juice,
    poster: row.poster,
    posterUrl: row.posterUrl,
    backdropUrl: row.backdropUrl,
    synopsis: row.synopsis,
    platforms: toPlatforms(row.platforms),
  };
}

export function serializeCategory(row: CategoryRow, count?: number): CategoryDTO {
  return { id: row.id, name: row.name, sortOrder: row.sortOrder, ...(count === undefined ? {} : { count }) };
}

export function serializeSubmission(row: SubmissionRow): SubmissionDTO {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    country: row.country,
    juice: row.juice,
    url: row.url,
    note: row.note,
    contact: row.contact,
    status: row.status as SubmissionStatus,
    contentId: row.contentId,
    createdAt: row.createdAt.toISOString(),
  };
}

export function serializeComment(row: CommentRow): CommentDTO {
  return {
    id: row.id,
    itemId: row.itemId,
    text: row.text,
    status: row.status as CommentStatus,
    createdAt: row.createdAt.toISOString(),
  };
}

/** 비밀번호 해시는 절대 밖으로 내보내지 않는다. */
export function serializeAdminUser(row: AdminUserRow): AdminUserDTO {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: (row.role === "ADMIN" ? "ADMIN" : "EDITOR") as AdminRole,
    isActive: row.isActive,
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}
