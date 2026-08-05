import { z } from "zod";
import { fail, handle, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import {
  GA_PROPERTY_SETTING_KEY,
  GA_SETTING_KEY,
  credentialsLookValid,
  getGaStatus,
  parseCredentials,
} from "@/lib/ga-data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  propertyId: z.string().trim().min(1, "속성 ID를 입력해주세요."),
  credentials: z.string().trim().min(1, "서비스 계정 JSON 내용을 붙여넣어 주세요."),
});

/**
 * 방문 분석 연결 설정.
 * 서비스 계정 키는 운영 자격증명이라 슈퍼관리자만 다룰 수 있고, 저장 후에도 다시 읽어가지 않는다.
 */
export async function PUT(req: Request) {
  return handle(async () => {
    await requireRole("ADMIN");
    const input = bodySchema.parse(await req.json());

    const propertyId = input.propertyId.replace(/\D/g, "");
    if (!propertyId) {
      return fail("속성 ID는 숫자예요. 측정 ID(G-...)가 아니라 속성 ID를 넣어주세요.", 400);
    }

    const parsed = parseCredentials(input.credentials);
    if (!parsed.privateKey) {
      return fail(
        "붙여넣은 내용에서 비공개 키를 찾지 못했어요. 다운로드한 JSON 파일을 열어 { 부터 } 까지 전부 붙여넣어 주세요.",
        400,
      );
    }
    if (!credentialsLookValid(parsed)) {
      return fail(
        "서비스 계정 JSON 형태가 아니에요. private_key 와 client_email 이 함께 들어 있어야 해요.",
        400,
      );
    }

    // 원본을 그대로 저장한다 — 나중에 형식이 조금 달라져도 읽는 쪽에서 흡수한다.
    await prisma.$transaction([
      prisma.siteSetting.upsert({
        where: { key: GA_SETTING_KEY },
        create: { key: GA_SETTING_KEY, value: input.credentials },
        update: { value: input.credentials },
      }),
      prisma.siteSetting.upsert({
        where: { key: GA_PROPERTY_SETTING_KEY },
        create: { key: GA_PROPERTY_SETTING_KEY, value: propertyId },
        update: { value: propertyId },
      }),
    ]);

    return ok({ status: await getGaStatus() });
  });
}

/** 저장한 연결 설정을 지운다. 환경변수로 넣은 값이 있으면 그쪽으로 되돌아간다. */
export async function DELETE() {
  return handle(async () => {
    await requireRole("ADMIN");
    await prisma.siteSetting.deleteMany({
      where: { key: { in: [GA_SETTING_KEY, GA_PROPERTY_SETTING_KEY] } },
    });
    return ok({ status: await getGaStatus() });
  });
}
