/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { LEGAL_DOCUMENTS, LEGAL_REVISIONS } from "./legal-seed";

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = ["영화", "드라마", "웹툰", "웹소설", "소설", "애니", "만화"];

/** 플랫폼 이름 → 실제 서비스 주소. 상세 페이지의 "시청 가능한 곳"이 새 탭으로 열린다. */
const PLATFORM_URLS: Record<string, string> = {
  왓챠: "https://watcha.com",
  웨이브: "https://www.wavve.com",
  넷플릭스: "https://www.netflix.com",
  티빙: "https://www.tving.com",
  라프텔: "https://laftel.net",
  디즈니플러스: "https://www.disneyplus.com",
  네이버웹툰: "https://comic.naver.com",
  네이버시리즈: "https://series.naver.com",
  카카오페이지: "https://page.kakao.com",
  리디북스: "https://ridibooks.com",
  문피아: "https://www.munpia.com",
  교보문고: "https://www.kyobobook.co.kr",
  "교보문고 전자책": "https://ebook.kyobobook.co.kr",
  "예스24 전자책": "https://ebook.yes24.com",
};

type SeedPlatform = { name: string; type: "무료" | "유료" };

type SeedItem = {
  id: number;
  title: string;
  category: string;
  country: "국내" | "해외";
  countryDetail: string;
  year: number;
  creatorLabel: "감독" | "연출" | "작가";
  creatorName: string;
  leads: string[];
  tags: string[];
  juice: boolean;
  poster?: boolean;
  synopsis: string;
  platforms: SeedPlatform[];
};

const DEFAULT_ITEMS: SeedItem[] = [
  { id: 1, title: "아가씨", category: "영화", country: "국내", countryDetail: "한국", year: 2016, creatorLabel: "감독", creatorName: "박찬욱", leads: ["김민희", "김태리"], tags: ["스릴러", "로맨스", "시대극"], juice: false, synopsis: "1930년대 일제강점기, 상속녀 히데코의 새 하녀로 들어온 숙희. 신뢰와 욕망이 뒤엉킨 두 여자의 관계가 예상 밖의 반전으로 이어지는 이야기.", platforms: [{ name: "왓챠", type: "유료" }, { name: "웨이브", type: "유료" }, { name: "넷플릭스", type: "유료" }] },
  { id: 2, title: "캐롤", category: "영화", country: "해외", countryDetail: "미국", year: 2015, creatorLabel: "감독", creatorName: "토드 헤인즈", leads: ["케이트 블란쳇", "루니 마라"], tags: ["로맨스", "드라마"], juice: false, synopsis: "1950년대 뉴욕, 백화점 점원 테레즈와 상류층 여성 캐롤. 서로에게 이끌리며 벌어지는 조용하고 강렬한 사랑 이야기.", platforms: [{ name: "왓챠", type: "유료" }, { name: "디즈니플러스", type: "유료" }] },
  { id: 3, title: "오렌지만이 과일은 아니다", category: "소설", country: "해외", countryDetail: "영국", year: 1985, creatorLabel: "작가", creatorName: "지넷 윈터슨", leads: ["잔넷"], tags: ["성장", "자전", "문학"], juice: false, synopsis: "엄격한 종교 공동체에서 자란 소녀가 자기 자신을 발견해가는 과정을 그린 반자전적 성장 소설.", platforms: [{ name: "리디북스", type: "유료" }, { name: "교보문고 전자책", type: "유료" }] },
  { id: 4, title: "밤의 화원", category: "드라마", country: "국내", countryDetail: "한국", year: 2024, creatorLabel: "연출", creatorName: "정하은", leads: ["이수아", "진세은"], tags: ["오피스", "미스터리"], juice: true, poster: false, synopsis: "경쟁 관계였던 두 팀장이 사내 비리 사건을 함께 파헤치며 예상치 못한 감정을 마주하는 오피스 미스터리.", platforms: [{ name: "티빙", type: "유료" }, { name: "웨이브", type: "유료" }] },
  { id: 5, title: "너와 나의 계절", category: "드라마", country: "해외", countryDetail: "일본", year: 2023, creatorLabel: "연출", creatorName: "사토 유이", leads: ["유나", "미즈키"], tags: ["청춘", "학원"], juice: false, synopsis: "전학생 유나와 반장 미즈키. 마지막 학년, 짧고 선명한 한 시절을 함께 통과하는 두 사람의 이야기.", platforms: [{ name: "왓챠", type: "유료" }, { name: "라프텔", type: "유료" }] },
  { id: 6, title: "여름, 그녀와", category: "웹툰", country: "국내", countryDetail: "한국", year: 2022, creatorLabel: "작가", creatorName: "하이재", leads: ["서하늘", "강초록"], tags: ["일상", "힐링"], juice: false, poster: false, synopsis: "바닷가 마을에 내려온 사진작가와 오래된 서점을 지키는 로컬 청년의 잔잔한 여름 일상.", platforms: [{ name: "네이버웹툰", type: "무료" }, { name: "네이버시리즈", type: "유료" }] },
  { id: 7, title: "붉은 실", category: "웹소설", country: "국내", countryDetail: "한국", year: 2023, creatorLabel: "작가", creatorName: "주안", leads: ["라이엘라", "세라핀"], tags: ["로맨스판타지"], juice: false, poster: false, synopsis: "서로 다른 왕국의 후계자로 태어난 두 사람. 정략적으로 얽힌 운명이 진짜 마음으로 바뀌어가는 로맨스 판타지.", platforms: [{ name: "카카오페이지", type: "유료" }, { name: "리디북스", type: "유료" }] },
  { id: 8, title: "있잖아, 그날의 우리", category: "웹툰", country: "국내", countryDetail: "한국", year: 2021, creatorLabel: "작가", creatorName: "모카린", leads: ["윤소이", "하다은"], tags: ["학원"], juice: true, synopsis: "졸업을 앞둔 단짝 두 명. 우정인 줄로만 알았던 감정의 정체를 각자의 속도로 깨달아가는 학원물.", platforms: [{ name: "네이버웹툰", type: "무료" }] },
  { id: 9, title: "회귀한 대공님이 자꾸 저를 좋아합니다", category: "웹소설", country: "국내", countryDetail: "한국", year: 2024, creatorLabel: "작가", creatorName: "나비잠", leads: ["하르젠", "이자벨"], tags: ["로맨스판타지", "회귀물"], juice: true, synopsis: "죽음 직전 과거로 돌아온 대공. 이번 생에는 자신을 구해준 은인, 그 여기사만을 지키기로 결심하는데.", platforms: [{ name: "카카오페이지", type: "유료" }, { name: "문피아", type: "유료" }] },
  { id: 10, title: "물의 결", category: "소설", country: "국내", countryDetail: "한국", year: 2020, creatorLabel: "작가", creatorName: "한소림", leads: ["윤강", "문서희"], tags: ["문학", "성장"], juice: false, synopsis: "강가 마을에서 나고 자란 두 여자의 30년. 떠남과 돌아옴을 반복하며 이어지는 관계를 담은 장편소설.", platforms: [{ name: "교보문고", type: "유료" }, { name: "예스24 전자책", type: "유료" }] },
  { id: 11, title: "여름의 파랑", category: "애니", country: "해외", countryDetail: "일본", year: 2019, creatorLabel: "감독", creatorName: "미야모토 케이", leads: ["하나", "소라"], tags: ["청춘", "드라마"], juice: false, synopsis: "전학과 함께 시작된 만남. 두 소녀가 나눈 한 시절의 감정을 섬세한 그림체로 그린 청춘 애니메이션.", platforms: [{ name: "라프텔", type: "유료" }, { name: "넷플릭스", type: "유료" }] },
  { id: 12, title: "부실장님과 나", category: "드라마", country: "국내", countryDetail: "한국", year: 2023, creatorLabel: "연출", creatorName: "김도윤", leads: ["오하람", "진세은"], tags: ["오피스", "코미디"], juice: true, synopsis: "까칠한 부실장과 신입사원. 매일 부딪히던 두 사람 사이에 묘한 기류가 흐르기 시작하는 오피스 코미디.", platforms: [{ name: "티빙", type: "유료" }] },
  { id: 13, title: "리본과 나이프", category: "만화", country: "해외", countryDetail: "일본", year: 2018, creatorLabel: "작가", creatorName: "아오이 렌", leads: ["레이", "유즈하"], tags: ["액션", "드라마"], juice: false, synopsis: "뒷골목 해결사로 살아가는 두 여자. 서로를 지키기 위해 싸우며 신뢰를 쌓아가는 액션 드라마.", platforms: [{ name: "리디북스", type: "유료" }] },
  { id: 14, title: "스물, 다시 봄", category: "영화", country: "국내", countryDetail: "한국", year: 2022, creatorLabel: "감독", creatorName: "윤지수", leads: ["한지우", "오세인"], tags: ["청춘", "로맨스"], juice: false, synopsis: "대학 신입생 시절 서로를 스쳐간 두 사람이 10년 만에 다시 마주치며 시작되는 이야기.", platforms: [{ name: "왓챠", type: "유료" }] },
  { id: 15, title: "파란 리본", category: "웹툰", country: "해외", countryDetail: "일본", year: 2022, creatorLabel: "작가", creatorName: "유키노", leads: ["미유", "하즈키"], tags: ["학원", "판타지"], juice: false, synopsis: "마법 학교의 낙제생과 수석. 함께 치르는 시험을 통해 서로를 알아가는 학원 판타지.", platforms: [{ name: "네이버웹툰", type: "무료" }] },
  { id: 16, title: "계약 연애의 방식", category: "웹소설", country: "국내", countryDetail: "한국", year: 2023, creatorLabel: "작가", creatorName: "별밤지기", leads: ["서지안", "한이레"], tags: ["로맨스"], juice: false, poster: false, synopsis: "가문의 압박을 피하려 계약 연애를 시작한 두 사람. 계약이 진심으로 바뀌어가는 과정을 그린 로맨스.", platforms: [{ name: "카카오페이지", type: "유료" }] },
  { id: 17, title: "마지막 여름학기", category: "드라마", country: "해외", countryDetail: "태국", year: 2022, creatorLabel: "연출", creatorName: "나타야 촘차이", leads: ["핌", "난"], tags: ["청춘"], juice: false, synopsis: "교환학생으로 만난 두 사람의 한 학기. 헤어짐을 앞두고서야 선명해지는 마음을 그린 청춘 드라마.", platforms: [{ name: "왓챠", type: "유료" }] },
  { id: 18, title: "우리만 아는 계절", category: "애니", country: "국내", countryDetail: "한국", year: 2023, creatorLabel: "감독", creatorName: "배지훈", leads: ["하나", "바다"], tags: ["힐링"], juice: false, synopsis: "작은 섬마을로 전학 온 소녀와 그 섬을 지키는 등대지기 딸. 계절이 바뀌며 가까워지는 두 사람.", platforms: [{ name: "라프텔", type: "유료" }] },
];

const HOME_ROWS = [
  { title: "이번 주 추천", ids: [1, 2, 5, 9, 11, 14] },
  { title: "착즙 인생작 · 서브도 진심이야", ids: [4, 8, 9, 12] },
  { title: "웹소설 · 웹툰 원작 인기작", ids: [6, 7, 8, 9, 15, 16] },
  { title: "해외 콘텐츠 모음", ids: [2, 3, 5, 11, 13, 17] },
];

const HOUR = 1000 * 60 * 60;
const DEMO_COMMENTS = [
  { itemId: 1, text: "20년대 감성 연출이 진짜 예쁘다", status: "visible", offset: 48 * HOUR },
  { itemId: 1, text: "결말 반전 소름", status: "visible", offset: 24 * HOUR },
  { itemId: 5, text: "이 드라마 학생 때 봤어야 했는데ㅠㅠ", status: "visible", offset: 5 * HOUR },
  { itemId: 9, text: "이세계 로판 국룰 전개인데 은근 중독성 있음 (결말 스포 있음)", status: "hidden", offset: 10 * HOUR },
  { itemId: 12, text: "코미디 타이밍 미쳤다 ㅋㅋㅋ", status: "visible", offset: 0.5 * HOUR },
];

/** 운영자 계정은 항상 보장한다(없으면 로그인 자체가 불가능하므로). */
async function ensureAdminUser() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@drgl.local").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "drgl-admin-1234";
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`· 운영자 계정 이미 있음 (${email})`);
    return;
  }
  await prisma.adminUser.create({
    data: { email, name: "운영자", role: "ADMIN", passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log(`· 운영자 계정 생성 → ${email}`);
}

/**
 * 약관·개인정보처리방침의 최초 버전을 보장한다.
 * 이미 문서가 있으면 손대지 않는다 — 어드민에서 고친 내용을 배포가 덮어쓰면 안 되기 때문.
 */
async function ensureLegalDocuments() {
  for (const doc of LEGAL_DOCUMENTS) {
    const existing = await prisma.legalDocument.findUnique({
      where: { slug: doc.slug },
      include: { versions: { take: 1 } },
    });
    if (existing?.versions.length) {
      console.log(`· ${doc.title} 이미 있음 (건너뜀)`);
      continue;
    }
    const document =
      existing ??
      (await prisma.legalDocument.create({ data: { slug: doc.slug, title: doc.title } }));
    await prisma.legalDocumentVersion.create({
      data: {
        documentId: document.id,
        version: 1,
        body: doc.body,
        effectiveDate: new Date("2026-08-04T00:00:00Z"),
        changeNote: "최초 작성",
        isPublished: true,
        publishedAt: new Date(),
        createdByName: "시스템",
      },
    });
    console.log(`· ${doc.title} v1 생성`);
  }
}

/**
 * 법적으로 꼭 반영돼야 하는 개정을 발행한다.
 * 발행중인 본문에 표식 문구가 이미 있으면 건너뛴다 — 배포할 때마다 새 버전이 쌓이지 않는다.
 */
async function ensureLegalRevisions() {
  for (const revision of LEGAL_REVISIONS) {
    const document = await prisma.legalDocument.findUnique({
      where: { slug: revision.slug },
      include: { versions: { orderBy: { version: "desc" } } },
    });
    if (!document || document.versions.length === 0) continue;

    const published = document.versions.find((v) => v.isPublished);
    if (published?.body.includes(revision.marker)) {
      console.log(`· ${document.title} 개정 이미 반영됨 (건너뜀)`);
      continue;
    }

    const nextVersion = document.versions[0].version + 1;
    await prisma.$transaction([
      prisma.legalDocumentVersion.updateMany({
        where: { documentId: document.id, isPublished: true },
        data: { isPublished: false },
      }),
      prisma.legalDocumentVersion.create({
        data: {
          documentId: document.id,
          version: nextVersion,
          body: revision.body,
          effectiveDate: new Date(revision.effectiveDate),
          changeNote: revision.changeNote,
          isPublished: true,
          publishedAt: new Date(),
          createdByName: "시스템",
        },
      }),
    ]);
    console.log(`· ${document.title} v${nextVersion} 발행 (${revision.changeNote})`);
  }
}

async function main() {
  await ensureLegalDocuments();
  await ensureLegalRevisions();

  // 이미 운영 중인 DB에 배포할 때마다 시드가 덮어쓰지 않도록,
  // 콘텐츠가 하나라도 있으면 데모 데이터 시드는 건너뛴다.
  if ((await prisma.content.count()) > 0) {
    console.log("· 이미 콘텐츠가 있어 데모 시드는 건너뜁니다.");
    await ensureAdminUser();
    console.log("시드 완료");
    return;
  }

  console.log("· 카테고리 시드");
  for (const [index, name] of DEFAULT_CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { name },
      create: { name, sortOrder: index },
      update: { sortOrder: index },
    });
  }

  console.log("· 콘텐츠 시드");
  for (const item of DEFAULT_ITEMS) {
    const platforms = item.platforms.map((p) => ({
      name: p.name,
      type: p.type,
      url: PLATFORM_URLS[p.name] ?? "",
    }));
    const data = {
      title: item.title,
      category: item.category,
      country: item.country,
      countryDetail: item.countryDetail,
      year: item.year,
      creatorLabel: item.creatorLabel,
      creatorName: item.creatorName,
      leads: item.leads,
      tags: item.tags,
      juice: item.juice,
      poster: item.poster !== false,
      synopsis: item.synopsis,
      platforms,
    };
    await prisma.content.upsert({
      where: { id: item.id },
      create: { id: item.id, ...data },
      update: data,
    });
  }
  // upsert 로 명시적 id를 넣었으므로 시퀀스를 최대 id 뒤로 맞춰준다.
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"Content"', 'id'), COALESCE((SELECT MAX(id) FROM "Content"), 1))`,
  );

  console.log("· 홈 큐레이션 시드");
  if ((await prisma.homeRow.count()) === 0) {
    for (const [index, row] of HOME_ROWS.entries()) {
      await prisma.homeRow.create({
        data: {
          title: row.title,
          sortOrder: index,
          items: { create: row.ids.map((contentId, order) => ({ contentId, sortOrder: order })) },
        },
      });
    }
  }

  console.log("· 히어로 배너 설정");
  const hero = await prisma.content.findFirst({ where: { title: "아가씨" } });
  if (hero) {
    await prisma.siteSetting.upsert({
      where: { key: "featuredId" },
      create: { key: "featuredId", value: String(hero.id) },
      update: { value: String(hero.id) },
    });
  }

  console.log("· 데모 한줄평 시드");
  if ((await prisma.comment.count()) === 0) {
    const now = Date.now();
    for (const comment of DEMO_COMMENTS) {
      await prisma.comment.create({
        data: {
          itemId: comment.itemId,
          text: comment.text,
          status: comment.status,
          createdAt: new Date(now - comment.offset),
        },
      });
    }
  }

  await ensureAdminUser();

  console.log("시드 완료");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
