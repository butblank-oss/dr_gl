import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

/**
 * 1시간마다 다시 만든다.
 *
 * 매 요청마다 DB를 읽으면, 무료 티어 DB가 절전에서 깨어나는 순간에 검색엔진이
 * 가져갈 경우 "가져올 수 없음"으로 실패 처리될 수 있다. 새 콘텐츠가 1시간 늦게
 * 반영되는 건 색인 주기(며칠)에 비하면 의미가 없다.
 */
export const revalidate = 3600;

/**
 * /sitemap.xml
 * 구글·빙에 "우리 사이트에 이런 주소들이 있다"고 알려주는 목록.
 * 콘텐츠 상세는 DB에서 전부 읽어 넣는다 — 새 작품을 등록하면 자동으로 포함된다.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [contents, categories] = await Promise.all([
    prisma.content.findMany({ select: { id: true, updatedAt: true }, orderBy: { id: "asc" } }),
    prisma.category.findMany({ select: { name: true }, orderBy: [{ sortOrder: "asc" }] }),
  ]);

  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/category`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/submit`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/board`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${SITE_URL}/category?category=${encodeURIComponent(category.name)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const contentPages: MetadataRoute.Sitemap = contents.map((content) => ({
    url: `${SITE_URL}/content/${content.id}`,
    lastModified: content.updatedAt,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  return [...staticPages, ...categoryPages, ...contentPages];
}
