import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * /robots.txt
 * 사이트 전체는 열어두되 어드민·API·내부 검색 결과는 색인하지 않는다.
 * (내부 검색 결과 페이지는 구글이 "검색 결과의 검색 결과"로 보고 품질 평가를 깎는다)
 *
 * 업로드 이미지(/media)는 막지 않는다 — 막으면 검색 결과와 SNS 미리보기에서
 * 포스터가 표시되지 않는다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/search"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
