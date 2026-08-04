import "server-only";

import { prisma } from "@/lib/prisma";
import {
  serializeCategory,
  serializeComment,
  serializeContent,
  serializeLegalVersion,
} from "@/lib/serialize";
import type { CategoryDTO, CommentDTO, ContentDTO, HomeRowDTO } from "@/lib/types";

export const FEATURED_SETTING_KEY = "featuredId";

export async function getCategories(): Promise<CategoryDTO[]> {
  const rows = await prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] });
  return rows.map((row) => serializeCategory(row));
}

export async function getCategoriesWithCount(): Promise<CategoryDTO[]> {
  const [rows, grouped] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.content.groupBy({ by: ["category"], _count: { _all: true } }),
  ]);
  const counts = new Map(grouped.map((g) => [g.category, g._count._all]));
  return rows.map((row) => serializeCategory(row, counts.get(row.name) ?? 0));
}

export async function getAllContents(): Promise<ContentDTO[]> {
  const rows = await prisma.content.findMany({ orderBy: { id: "asc" } });
  return rows.map(serializeContent);
}

export type ContentFilter = {
  category?: string;
  country?: string;
  juiceOnly?: boolean;
  query?: string;
};

/** 카테고리 탐색 화면의 필터. '전체'는 필터 해제로 취급한다. */
export async function getFilteredContents(filter: ContentFilter): Promise<ContentDTO[]> {
  const where: Record<string, unknown> = {};
  if (filter.category && filter.category !== "전체") where.category = filter.category;
  if (filter.country && filter.country !== "전체") where.country = filter.country;
  if (filter.juiceOnly) where.juice = true;

  const rows = await prisma.content.findMany({ where, orderBy: { id: "asc" } });
  return rows.map(serializeContent);
}

/** 검색 — 제목/제작자/카테고리/태그 중 하나라도 포함하면 매치. */
export async function searchContents(rawQuery: string): Promise<ContentDTO[]> {
  const q = rawQuery.trim();
  if (!q) return [];
  const rows = await prisma.content.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { creatorName: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
        { tags: { has: q } },
      ],
    },
    orderBy: { id: "asc" },
  });

  // tags 는 부분일치가 필요해 DB의 has(정확일치)로 못 잡는 경우가 있어 한 번 더 보완한다.
  const matchedIds = new Set(rows.map((r) => r.id));
  const tagFallback = await prisma.content.findMany({
    where: { id: { notIn: [...matchedIds] } },
    orderBy: { id: "asc" },
  });
  const extra = tagFallback.filter((row) => row.tags.some((t) => t.includes(q)));

  return [...rows, ...extra].sort((a, b) => a.id - b.id).map(serializeContent);
}

export async function getContentById(id: number): Promise<ContentDTO | null> {
  const row = await prisma.content.findUnique({ where: { id } });
  return row ? serializeContent(row) : null;
}

/** "이런 작품은 어때요?" — 같은 카테고리의 다른 콘텐츠 최대 6개. */
export async function getRelatedByCategory(item: ContentDTO): Promise<ContentDTO[]> {
  const rows = await prisma.content.findMany({
    where: { category: item.category, id: { not: item.id } },
    orderBy: { id: "asc" },
    take: 6,
  });
  return rows.map(serializeContent);
}

/** "{배우명}의 다른 작품" — 출연진이 한 명이라도 겹치는 콘텐츠 최대 6개. */
export async function getRelatedByLead(
  item: ContentDTO,
): Promise<{ items: ContentDTO[]; sharedLeadName: string }> {
  if (item.leads.length === 0) return { items: [], sharedLeadName: "" };
  const rows = await prisma.content.findMany({
    where: { id: { not: item.id }, leads: { hasSome: item.leads } },
    orderBy: { id: "asc" },
    take: 6,
  });
  const items = rows.map(serializeContent);
  const sharedLeadName = items.length
    ? (item.leads.find((name) => items[0]!.leads.includes(name)) ?? "")
    : "";
  return { items, sharedLeadName };
}

/** 상세 페이지에 노출되는 한줄평 — 숨김 처리된 항목은 제외(soft-hide), 등록 순 정렬. */
export async function getVisibleComments(itemId: number): Promise<CommentDTO[]> {
  const rows = await prisma.comment.findMany({
    where: { itemId, status: "visible" },
    orderBy: { id: "asc" },
  });
  return rows.map(serializeComment);
}

export async function getFeaturedContent(): Promise<ContentDTO | null> {
  const setting = await prisma.siteSetting.findUnique({ where: { key: FEATURED_SETTING_KEY } });
  const featuredId = Number(setting?.value);
  if (Number.isInteger(featuredId) && featuredId > 0) {
    const row = await prisma.content.findUnique({ where: { id: featuredId } });
    if (row) return serializeContent(row);
  }
  const fallback = await prisma.content.findFirst({ orderBy: { id: "asc" } });
  return fallback ? serializeContent(fallback) : null;
}

/** 홈 가로 스크롤 행 — 비어 있는 행은 화면에서 숨기므로 여기서 걸러낸다. */
export async function getHomeRows(): Promise<HomeRowDTO[]> {
  const rows = await prisma.homeRow.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: {
      items: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: { content: true },
      },
    },
  });

  return rows
    .map((row) => ({
      id: row.id,
      title: row.title,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      items: row.items.map((entry) => serializeContent(entry.content)),
    }))
    .filter((row) => row.items.length > 0);
}

/** 어드민에서는 비활성/빈 행도 모두 보여야 한다. */
export async function getAllHomeRows(): Promise<HomeRowDTO[]> {
  const rows = await prisma.homeRow.findMany({
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    include: {
      items: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        include: { content: true },
      },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    items: row.items.map((entry) => serializeContent(entry.content)),
  }));
}

/* ---------- 약관·정책 문서 ---------- */

/** 프론트에 노출할 발행중 버전과 개정 이력을 함께 가져온다. */
export async function getLegalDocument(slug: string) {
  const doc = await prisma.legalDocument.findUnique({
    where: { slug },
    include: { versions: { orderBy: { version: "desc" } } },
  });
  if (!doc) return null;

  const published = doc.versions.find((v) => v.isPublished) ?? null;
  return {
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    published: published ? serializeLegalVersion(published) : null,
    // 이력은 발행된 적 있는 버전만 공개한다 (작성 중인 초안은 숨김)
    history: doc.versions.filter((v) => v.publishedAt).map(serializeLegalVersion),
  };
}

export async function getLegalVersion(slug: string, version: number) {
  const row = await prisma.legalDocumentVersion.findFirst({
    where: { version, document: { slug }, publishedAt: { not: null } },
    include: { document: true },
  });
  if (!row) return null;
  return { title: row.document.title, slug: row.document.slug, ...serializeLegalVersion(row) };
}

export async function getAllLegalDocuments() {
  const docs = await prisma.legalDocument.findMany({
    orderBy: { id: "asc" },
    include: { versions: { orderBy: { version: "desc" } } },
  });
  return docs.map((doc) => ({
    id: doc.id,
    slug: doc.slug,
    title: doc.title,
    versions: doc.versions.map(serializeLegalVersion),
  }));
}
