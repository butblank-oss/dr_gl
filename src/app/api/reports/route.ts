import { z } from "zod";
import { handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { generateReport, REPORT_KINDS } from "@/lib/report";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({ kind: z.enum(REPORT_KINDS) });

/** 어드민의 "지금 다시 만들기" — 예약 시간을 기다리지 않고 즉시 갱신한다. */
export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin();
    const { kind } = bodySchema.parse(await req.json());
    const report = await generateReport(kind);
    return ok({ report: { kind: report.kind, periodStart: report.periodStart } });
  });
}
