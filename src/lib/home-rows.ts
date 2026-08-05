import "server-only";

import type { Prisma } from "@prisma/client";

/** 트랜잭션 안에서도 밖에서도 쓸 수 있는 최소 인터페이스 */
type Client = Prisma.TransactionClient;

/**
 * 콘텐츠가 어떤 홈 큐레이션 행에 들어가 있는지를 선택한 목록과 똑같이 맞춘다.
 *
 * - 새로 체크된 행에는 맨 뒤에 추가한다 (홈 큐레이션 화면에서 드래그로 순서를 바꿀 수 있다)
 * - 체크가 풀린 행에서는 뺀다
 * - 이미 들어가 있는 행은 순서를 건드리지 않는다
 *
 * rowIds 가 undefined 면 아무것도 하지 않는다 — 이 기능을 모르는 예전 요청이나
 * 다른 화면의 저장이 배치를 지워버리지 않게 하기 위해서다.
 */
export async function syncHomeRowMembership(
  client: Client,
  contentId: number,
  rowIds: number[] | undefined,
): Promise<void> {
  if (!rowIds) return;

  const wanted = [...new Set(rowIds)];
  // 지워진 행 id 가 섞여 오면 외래키 오류가 나므로 실제로 있는 행만 남긴다.
  const existingRows = wanted.length
    ? await client.homeRow.findMany({ where: { id: { in: wanted } }, select: { id: true } })
    : [];
  const validRowIds = new Set(existingRows.map((row) => row.id));

  const current = await client.homeRowItem.findMany({
    where: { contentId },
    select: { id: true, rowId: true },
  });

  const toRemove = current.filter((item) => !validRowIds.has(item.rowId)).map((item) => item.id);
  if (toRemove.length) {
    await client.homeRowItem.deleteMany({ where: { id: { in: toRemove } } });
  }

  const currentRowIds = new Set(current.map((item) => item.rowId));
  for (const rowId of validRowIds) {
    if (currentRowIds.has(rowId)) continue;
    const last = await client.homeRowItem.findFirst({
      where: { rowId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    await client.homeRowItem.create({
      data: { rowId, contentId, sortOrder: (last?.sortOrder ?? -1) + 1 },
    });
  }
}
