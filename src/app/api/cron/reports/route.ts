import { handle, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { dueKinds, generateReport, REPORT_KINDS, type ReportKind } from "@/lib/report";

export const dynamic = "force-dynamic";
// 리포트 생성은 GA 호출이 여러 번이라 넉넉히 잡는다.
export const maxDuration = 60;

/**
 * 예약 실행 — 매일 한국 시간 오전 10시(UTC 01:00)에 Vercel 이 부른다.
 * 그날 만들어야 할 리포트를 판단한다: 매일 일별, 월요일이면 주별, 1일이면 월별.
 *
 * 무료 요금제는 예약 작업을 하루 한 번만 돌릴 수 있어서, 한 번 돌 때 필요한 걸 모두 만든다.
 */
export async function GET(req: Request) {
  return handle(async () => {
    // Vercel 은 CRON_SECRET 이 설정돼 있으면 이 헤더를 붙여 보낸다.
    const secret = process.env.CRON_SECRET;
    const authorized = secret
      ? req.headers.get("authorization") === `Bearer ${secret}`
      : Boolean(await getSessionUser()); // 비밀값을 안 넣었으면 로그인한 운영자만

    if (!authorized) return ok({ skipped: "권한 없음" }, 401);

    const requested = new URL(req.url).searchParams.get("kind");
    const kinds: ReportKind[] =
      requested && REPORT_KINDS.includes(requested as ReportKind)
        ? [requested as ReportKind]
        : dueKinds();

    const made: string[] = [];
    const failed: { kind: string; error: string }[] = [];
    for (const kind of kinds) {
      try {
        const report = await generateReport(kind);
        made.push(`${kind}:${report.periodStart}`);
      } catch (error) {
        // 하나가 실패해도 나머지는 만든다.
        failed.push({ kind, error: error instanceof Error ? error.message : "알 수 없는 오류" });
      }
    }
    return ok({ made, failed });
  });
}
