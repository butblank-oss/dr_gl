import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * 같은 작품인지 비교하기 위한 제목 정규화.
 * 띄어쓰기·문장부호·괄호 안 연도를 지우고 소문자로 맞춘다.
 * "아가씨", "아 가 씨", "아가씨(2016)", "The Handmaiden!" → 같은 값으로 모인다.
 */
export function titleKey(title: string): string {
  // 아래 SQL의 regexp_replace 와 반드시 같은 규칙이어야 한다.
  return title
    .toLowerCase()
    .replace(/[([]\s*(19|20)\d{2}\s*[)\]]/g, "") // 제목 뒤에 붙은 (2016) 같은 연도
    .replace(/[^0-9a-z가-힣]/g, "");
}

export type DuplicateMatch = {
  id: number;
  title: string;
  category: string;
  year: number;
};

/**
 * 이미 등록된 작품 중 제목이 같은 것을 찾는다.
 *
 * 정규화한 값을 컬럼으로 들고 있으면 색인을 탈 수 있지만, 그러면 저장할 때마다
 * 두 값을 맞춰줘야 하고 규칙을 고칠 때 전부 다시 계산해야 한다. 작품 수가
 * 수천 건 수준이라 매번 DB에서 계산하는 편이 항상 정확하고 관리도 쉽다.
 */
export async function findDuplicateContents(title: string): Promise<DuplicateMatch[]> {
  const key = titleKey(title);
  if (key.length < 2) return [];

  return prisma.$queryRaw<DuplicateMatch[]>`
    SELECT id, title, category, year
    FROM "Content"
    WHERE regexp_replace(
            regexp_replace(lower(title), '[(\[][[:space:]]*(19|20)[0-9]{2}[[:space:]]*[)\]]', '', 'g'),
            '[^0-9a-z가-힣]', '', 'g'
          ) = ${key}
    ORDER BY id ASC
    LIMIT 5
  `;
}

/**
 * 여러 제보를 한 번에 대조한다.
 * 제보마다 질의하면 건수만큼 쿼리가 나가므로, 작품 목록을 한 번만 읽어 메모리에서 맞춘다.
 */
export async function duplicatesFor(
  submissions: { id: number; title: string }[],
): Promise<Record<number, DuplicateMatch[]>> {
  const result: Record<number, DuplicateMatch[]> = {};
  if (submissions.length === 0) return result;

  const contents = await prisma.content.findMany({
    select: { id: true, title: true, category: true, year: true },
  });

  const byKey = new Map<string, DuplicateMatch[]>();
  for (const content of contents) {
    const key = titleKey(content.title);
    if (key.length < 2) continue;
    const bucket = byKey.get(key);
    if (bucket) bucket.push(content);
    else byKey.set(key, [content]);
  }

  for (const submission of submissions) {
    const matches = byKey.get(titleKey(submission.title));
    if (matches?.length) result[submission.id] = matches;
  }
  return result;
}

/** 아직 검토하지 않은 제보 중 제목이 같은 것 (같은 작품이 여러 번 들어온 경우) */
export async function countPendingDuplicates(title: string, exceptId?: number): Promise<number> {
  const key = titleKey(title);
  if (key.length < 2) return 0;

  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "Submission"
    WHERE status = 'pending'
      AND id <> ${exceptId ?? 0}
      AND regexp_replace(
            regexp_replace(lower(title), '[(\[][[:space:]]*(19|20)[0-9]{2}[[:space:]]*[)\]]', '', 'g'),
            '[^0-9a-z가-힣]', '', 'g'
          ) = ${key}
  `;
  return Number(rows[0]?.count ?? 0);
}
