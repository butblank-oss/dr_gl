import { SITE, SITE_DESCRIPTION, absoluteUrl } from "@/lib/site";
import type { ContentDTO } from "@/lib/types";

type Json = Record<string, unknown>;

/**
 * 검색엔진용 구조화 데이터(JSON-LD).
 * 사람 눈에는 보이지 않지만, 구글이 "이 페이지는 2016년 한국 영화이고 감독은 누구"까지
 * 이해하게 해준다. 검색 결과에 이미지·부가 정보가 함께 나올 확률이 올라간다.
 */
function JsonLdScript({ data }: { data: Json }) {
  return (
    <script
      type="application/ld+json"
      // 구조화 데이터는 반드시 script 태그 안의 JSON이어야 해서 이 방법 외에는 없다.
      // 값은 우리가 만든 객체를 JSON.stringify 한 것이라 임의의 마크업이 섞이지 않는다.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

/** 사이트 전체 정보 + 구글 검색결과 안에서 바로 검색할 수 있게 하는 SearchAction */
export function SiteJsonLd() {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": `${SITE.url}/#website`,
            url: SITE.url,
            name: SITE.name,
            description: SITE_DESCRIPTION,
            inLanguage: "ko-KR",
            publisher: { "@id": `${SITE.url}/#organization` },
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate: `${SITE.url}/search?q={search_term_string}`,
              },
              "query-input": "required name=search_term_string",
            },
          },
          {
            "@type": "Organization",
            "@id": `${SITE.url}/#organization`,
            name: SITE.name,
            alternateName: SITE.operator,
            url: SITE.url,
            email: SITE.email,
          },
        ],
      }}
    />
  );
}

/** 카테고리(형식) → schema.org 타입 */
function schemaTypeOf(category: string): string {
  switch (category) {
    case "영화":
      return "Movie";
    case "드라마":
      return "TVSeries";
    case "애니":
      return "TVSeries";
    case "웹툰":
    case "만화":
      return "ComicSeries";
    case "소설":
    case "웹소설":
      return "Book";
    default:
      return "CreativeWork";
  }
}

/** 상세 페이지의 작품 정보 + 위치 표시(빵부스러기) */
export function ContentJsonLd({ item }: { item: ContentDTO }) {
  const type = schemaTypeOf(item.category);
  const url = absoluteUrl(`/content/${item.id}`);
  const image = item.poster && item.posterUrl ? absoluteUrl(item.posterUrl) : undefined;

  const work: Json = {
    "@type": type,
    "@id": `${url}#work`,
    name: item.title,
    url,
    description: item.synopsis || undefined,
    image,
    genre: item.tags.length ? item.tags : undefined,
    inLanguage: item.country === "국내" ? "ko" : undefined,
    countryOfOrigin: item.countryDetail
      ? { "@type": "Country", name: item.countryDetail }
      : undefined,
    datePublished: item.year ? String(item.year) : undefined,
    keywords: ["GL", "백합", "yuri", item.category, ...item.tags].join(", "),
  };

  // 만든 사람은 역할에 따라 필드가 다르다 (감독/연출 vs 작가)
  if (item.creatorName) {
    const person = { "@type": "Person", name: item.creatorName };
    if (item.creatorLabel === "작가") work.author = person;
    else work.director = person;
  }
  if (item.leads.length) {
    work.character = item.leads.map((name) => ({ "@type": "Person", name }));
  }

  // 어디서 볼 수 있는지 — 실제로 연결되는 플랫폼만
  const watchTargets = item.platforms.filter((platform) => platform.url);
  if (watchTargets.length) {
    work.potentialAction = watchTargets.map((platform) => ({
      "@type": "WatchAction",
      target: platform.url,
      name: platform.name,
    }));
  }

  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@graph": [
          work,
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "홈", item: SITE.url },
              {
                "@type": "ListItem",
                position: 2,
                name: item.category,
                item: `${SITE.url}/category?category=${encodeURIComponent(item.category)}`,
              },
              { "@type": "ListItem", position: 3, name: item.title, item: url },
            ],
          },
        ],
      }}
    />
  );
}

/** 카테고리 탐색 — 목록 페이지임을 알린다 */
export function ContentListJsonLd({
  items,
  name,
  path,
}: {
  items: ContentDTO[];
  name: string;
  path: string;
}) {
  return (
    <JsonLdScript
      data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name,
        url: absoluteUrl(path),
        isPartOf: { "@id": `${SITE.url}/#website` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: items.length,
          itemListElement: items.slice(0, 50).map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.title,
            url: absoluteUrl(`/content/${item.id}`),
          })),
        },
      }}
    />
  );
}
