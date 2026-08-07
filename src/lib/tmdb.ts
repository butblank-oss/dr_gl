import "server-only";

import { EMPTY_DRAFT, type ResearchDraft } from "@/lib/research";

/**
 * TMDB(The Movie Database)에서 작품 사실 정보를 가져온다.
 *
 * 키 발급도 호출도 무료라 제보가 몇 건 들어오든 비용이 붙지 않는다.
 * 대신 채울 수 있는 건 "사실"뿐이다 — 제목·연도·포스터·줄거리·감독·출연·시청처.
 * GL 층위나 커플명처럼 판단이 필요한 항목은 비워 두고, 왜 못 채웠는지 남긴다.
 *
 * 이미지 주소를 image.tmdb.org 로 받는 것은 포스터 정책과도 맞는다 —
 * 배포가 허용된 출처를 그대로 가리키고 우리 서버에 복제하지 않는다.
 */

const API = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

export function tmdbEnabled(): boolean {
  return Boolean(process.env.TMDB_API_KEY);
}

type Json = Record<string, unknown>;

/**
 * TMDB 는 language=ko-KR 로 물어도 제작국가는 영어로 준다.
 * 화면에 "South Korea" 가 그대로 뜨면 다른 항목과 따로 논다. 자주 나오는 것만 옮긴다.
 */
const COUNTRY_KO: Record<string, string> = {
  KR: "한국",
  JP: "일본",
  TH: "태국",
  US: "미국",
  GB: "영국",
  FR: "프랑스",
  CN: "중국",
  TW: "대만",
  HK: "홍콩",
  DE: "독일",
  CA: "캐나다",
  AU: "호주",
  ES: "스페인",
  IT: "이탈리아",
  IN: "인도",
  PH: "필리핀",
  VN: "베트남",
  ID: "인도네시아",
  IE: "아일랜드",
  SE: "스웨덴",
  NL: "네덜란드",
  BR: "브라질",
  MX: "멕시코",
};

async function get(path: string, params: Record<string, string> = {}): Promise<Json | null> {
  const url = new URL(`${API}${path}`);
  url.searchParams.set("api_key", process.env.TMDB_API_KEY as string);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    console.warn(`[tmdb] ${path} → ${response.status}`);
    return null;
  }
  return (await response.json()) as Json;
}

type Hit = { id: number; kind: "movie" | "tv"; popularity: number };

/**
 * 제목으로 찾는다. 한국어로 먼저 찾고, 못 찾으면 언어를 풀어 한 번 더.
 * 사람·컬렉션은 버리고 영화·시리즈만 본다.
 */
async function search(title: string): Promise<Hit | null> {
  for (const language of ["ko-KR", "en-US"]) {
    const body = await get("/search/multi", { query: title, language, include_adult: "false" });
    const results = (body?.results as Json[] | undefined) ?? [];
    const usable = results
      .filter((row) => row.media_type === "movie" || row.media_type === "tv")
      .map((row) => ({
        id: Number(row.id),
        kind: row.media_type as "movie" | "tv",
        popularity: Number(row.popularity ?? 0),
      }));
    // 동명이인·리메이크가 섞이면 인기순이 가장 덜 틀린다.
    if (usable.length) return usable.sort((a, b) => b.popularity - a.popularity)[0];
  }
  return null;
}

function nameOf(detail: Json, kind: "movie" | "tv"): string {
  return String((kind === "movie" ? detail.title : detail.name) ?? "").trim();
}

function yearOf(detail: Json, kind: "movie" | "tv"): string {
  const date = String((kind === "movie" ? detail.release_date : detail.first_air_date) ?? "");
  return date.slice(0, 4);
}

/** 감독(영화) 또는 크리에이터(시리즈). 둘 다 없으면 각본이라도. */
function creatorOf(detail: Json): string {
  const created = (detail.created_by as Json[] | undefined) ?? [];
  if (created.length) return created.map((p) => String(p.name)).join(", ");

  const crew = ((detail.credits as Json | undefined)?.crew as Json[] | undefined) ?? [];
  const directors = crew.filter((p) => p.job === "Director").map((p) => String(p.name));
  if (directors.length) return directors.join(", ");
  const writers = crew.filter((p) => p.job === "Writer" || p.job === "Screenplay").map((p) => String(p.name));
  return writers.slice(0, 2).join(", ");
}

/** 한국에서 볼 수 있는 곳. TMDB 는 이름만 주고 주소는 주지 않는다. */
function providersOf(detail: Json): string {
  const kr = ((detail["watch/providers"] as Json | undefined)?.results as Json | undefined)?.KR as
    | Json
    | undefined;
  if (!kr) return "";
  const names = new Set<string>();
  for (const bucket of ["flatrate", "rent", "buy", "free"]) {
    for (const item of (kr[bucket] as Json[] | undefined) ?? []) {
      names.add(String(item.provider_name));
    }
  }
  return [...names].join(", ");
}

/**
 * 응답을 초안으로 옮긴다. 네트워크와 떼어 둬야 실제 응답 모양으로 검증할 수 있다.
 * ko = 한국어 상세(credits·watch/providers 포함), en = 영어 상세(제목만 씀).
 */
export function buildDraftFromDetail(
  ko: Json,
  en: Json | null,
  kind: "movie" | "tv",
): ResearchDraft {
  const hit = { kind };
  const produced = ((ko.production_countries as Json[] | undefined) ?? []).map((c) => ({
    code: String(c.iso_3166_1 ?? ""),
    name: String(c.name ?? ""),
  }));
  const originCountry = ((ko.origin_country as string[] | undefined) ?? [])[0] ?? produced[0]?.code ?? "";
  const isKorean = originCountry === "KR" || produced.some((c) => c.code === "KR");
  // 아는 나라는 한국어로, 모르는 나라는 TMDB 가 준 이름 그대로.
  const countryDetail =
    COUNTRY_KO[originCountry] ?? produced.find((c) => c.code === originCountry)?.name ?? produced[0]?.name ?? originCountry;

  const cast = (((ko.credits as Json | undefined)?.cast as Json[] | undefined) ?? [])
    .slice(0, 4)
    .map((p) => String(p.name));

  const genres = ((ko.genres as Json[] | undefined) ?? []).map((g) => String(g.name));
  const poster = ko.poster_path ? `${IMAGE_BASE}${String(ko.poster_path)}` : "";

  const missing = [
    "GL 층위 — TMDB로는 판단할 수 없어요. 직접 골라주세요.",
    cast.length ? "출연 — TMDB 상위 배역이라 GL 커플만 남기고 지워주세요." : "",
    "태그 — 장르만 가져왔어요. 커플명·특징 태그는 직접 넣어주세요.",
    ko.overview ? "줄거리 — TMDB 공식 소개문이에요. 팬 시점 3줄로 다시 써주세요." : "",
    providersOf(ko) ? "바로가기 주소 — TMDB는 시청처 이름만 주고 주소는 주지 않아요." : "",
  ].filter(Boolean);

  return {
    ...EMPTY_DRAFT,
    titleKo: nameOf(ko, hit.kind),
    titleEn: en ? nameOf(en, hit.kind) : "",
    titleOriginal: String((hit.kind === "movie" ? ko.original_title : ko.original_name) ?? ""),
    category: hit.kind === "movie" ? "영화" : "드라마",
    year: yearOf(ko, hit.kind),
    country: isKorean ? "국내" : "해외",
    countryDetail,
    creator: creatorOf(ko),
    leads: cast.join(", "),
    tags: genres.join(", "),
    posterUrl: poster,
    synopsis: String(ko.overview ?? ""),
    platforms: providersOf(ko),
    unresolved: missing.join("\n"),
  };
}

/**
 * 한 건 조사한다. 못 찾으면 null.
 * 채우지 못한 항목은 빈 문자열로 두고, 이유를 unresolved 에 남긴다.
 */
export async function tmdbResearch(title: string): Promise<ResearchDraft | null> {
  if (!tmdbEnabled()) return null;

  const hit = await search(title);
  if (!hit) return null;

  const path = `/${hit.kind}/${hit.id}`;
  const [ko, en] = await Promise.all([
    get(path, { language: "ko-KR", append_to_response: "credits,watch/providers" }),
    get(path, { language: "en-US" }),
  ]);
  if (!ko) return null;

  return buildDraftFromDetail(ko, en, hit.kind);
}
