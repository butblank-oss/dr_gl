import "server-only";

import { prisma } from "@/lib/prisma";
import { buildResearchPrompt, hasDraftContent, parseResearchOutput, toDraft } from "@/lib/research";

/**
 * 제보가 들어오면 서버가 알아서 작품을 조사해 초안을 채운다.
 *
 * 키(ANTHROPIC_API_KEY)가 없으면 아무 일도 하지 않는다 — 그때는 어드민의
 * "프롬프트 복사 → 붙여넣기" 방식으로 손수 채우게 되어 있다.
 * 조사가 실패해도 제보 자체는 반드시 남아야 하므로 이 함수는 절대 throw 하지 않는다.
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
/** 조사는 양이 많고 판단은 단순해서 중간 모델로 충분하다. 필요하면 환경변수로 올린다. */
const DEFAULT_MODEL = "claude-sonnet-5";
/** 검색 없이 답하면 지어낼 위험이 커서, 웹 검색 도구를 붙여 보낸다. */
const WEB_SEARCH_TOOL = { type: "web_search_20250305", name: "web_search", max_uses: 8 };

export function autoResearchEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

type ContentBlock = { type: string; text?: string };

/** 응답에서 사람이 읽을 글자만 이어 붙인다. (검색 결과 블록은 버린다) */
function textOf(body: unknown): string {
  const content = (body as { content?: ContentBlock[] })?.content ?? [];
  return content
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string)
    .join("\n")
    .trim();
}

async function callClaude(prompt: string, withSearch: boolean): Promise<string> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY as string,
      "anthropic-version": API_VERSION,
    },
    body: JSON.stringify({
      model: process.env.RESEARCH_MODEL || DEFAULT_MODEL,
      max_tokens: 2000,
      ...(withSearch ? { tools: [WEB_SEARCH_TOOL] } : {}),
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${response.status} ${detail.slice(0, 300)}`);
  }
  return textOf(await response.json());
}

/**
 * 한 건 조사해 저장한다. 이미 초안이 있으면 건드리지 않는다 —
 * 운영자가 손으로 고쳐 둔 값을 자동 조사가 덮어쓰면 안 된다. (force 로만 덮어쓴다)
 */
export async function autoResearchSubmission(id: number, force = false): Promise<boolean> {
  if (!autoResearchEnabled()) return false;

  try {
    const submission = await prisma.submission.findUnique({ where: { id } });
    if (!submission) return false;
    if (!force && hasDraftContent(toDraft(submission.research))) return false;

    const prompt = buildResearchPrompt({
      title: submission.title,
      category: submission.category,
      country: submission.country,
      platform: submission.platform,
      url: submission.url,
      note: submission.note,
    });

    let text: string;
    try {
      text = await callClaude(prompt, true);
    } catch (error) {
      // 웹 검색 도구를 못 쓰는 계정·요금제일 수 있다. 검색 없이 한 번 더 시도한다.
      console.warn(`[auto-research] 검색 도구 호출 실패, 검색 없이 재시도: ${String(error)}`);
      text = await callClaude(prompt, false);
    }

    const draft = parseResearchOutput(text);
    if (!hasDraftContent(draft)) {
      console.warn(`[auto-research] #${id} 응답에서 알아볼 항목이 없음`);
      return false;
    }

    await prisma.submission.update({
      where: { id },
      data: { research: draft, researchedAt: new Date() },
    });
    return true;
  } catch (error) {
    // 조사에 실패해도 제보는 그대로 남는다. 운영자가 어드민에서 직접 채우면 된다.
    console.error(`[auto-research] #${id} 실패: ${String(error)}`);
    return false;
  }
}
