/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";

/**
 * 배포 시작 전에 DB를 깨우고 연결될 때까지 기다린다.
 *
 * 무료 티어 DB(Neon 등)는 한동안 쓰지 않으면 절전에 들어간다. 깨어나는 중에
 * `prisma migrate deploy` 가 붙으려 하면 연결 실패로 배포 전체가 죽는다.
 * 여기서 몇 번 두드려 깨워두면 그다음 단계들이 안정적으로 돈다.
 *
 * 끝내 실패해도 0으로 끝낸다 — 진짜 원인과 오류 메시지는 뒤따르는
 * migrate 단계가 훨씬 정확하게 알려주기 때문이다.
 */

const ATTEMPTS = 5;
const prisma = new PrismaClient();

for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log(`· DB 연결 확인 (${attempt}번째 시도)`);
    break;
  } catch (error) {
    const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
    if (attempt === ATTEMPTS) {
      console.warn(`· DB에 연결하지 못했습니다 (${ATTEMPTS}번 시도). 다음 단계로 넘어갑니다: ${message}`);
      break;
    }
    const waitMs = 2000 * 2 ** (attempt - 1); // 2s → 4s → 8s → 16s
    console.log(`· DB가 아직 안 깨어났어요 (${attempt}/${ATTEMPTS}). ${waitMs / 1000}초 후 재시도.`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

await prisma.$disconnect();
