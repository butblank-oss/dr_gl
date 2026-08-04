import type { ReactNode } from "react";

/**
 * 정책 문서용 최소 마크다운 렌더러.
 *
 * HTML 문자열을 만들어 주입(dangerouslySetInnerHTML)하지 않고 React 엘리먼트로 직접 만든다.
 * 그래서 운영자가 본문에 무엇을 적든 스크립트가 실행될 여지가 없다.
 *
 * 지원 문법
 *   ## 큰제목 / ### 작은제목
 *   - 목록
 *   1. 번호 목록
 *   빈 줄로 문단 구분
 *   **굵게**, [링크](https://...)
 */

const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((token, i) => {
    const key = `${keyPrefix}-${i}`;

    if (token.startsWith("**") && token.endsWith("**")) {
      return (
        <strong key={key} className="font-semibold text-fg">
          {token.slice(2, -2)}
        </strong>
      );
    }

    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
    if (link) {
      const [, label, href] = link;
      // 외부 링크만 새 탭으로. javascript: 같은 스킴은 렌더하지 않는다.
      const safe = /^(https?:\/\/|mailto:|\/)/i.test(href!);
      if (!safe) return <span key={key}>{label}</span>;
      const external = /^https?:\/\//i.test(href!);
      return (
        <a
          key={key}
          href={href}
          className="text-accent underline underline-offset-2"
          {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
        >
          {label}
        </a>
      );
    }

    return <span key={key}>{token}</span>;
  });
}

// 각 종류를 따로 적어야 kind 로 정확히 좁혀진다.
type Block =
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] };

function parse(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { kind: "ul" | "ol"; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ kind: "p", text: paragraph.join(" ") });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  for (const rawLine of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ kind: heading[1]!.length === 2 ? "h2" : "h3", text: heading[2]! });
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      if (list?.kind !== "ul") {
        flushList();
        list = { kind: "ul", items: [] };
      }
      list.items.push(bullet[1]!);
      continue;
    }

    const numbered = /^\d+\.\s+(.*)$/.exec(line);
    if (numbered) {
      flushParagraph();
      if (list?.kind !== "ol") {
        flushList();
        list = { kind: "ol", items: [] };
      }
      list.items.push(numbered[1]!);
      continue;
    }

    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}

export function Markdown({ body }: { body: string }) {
  const blocks = parse(body);

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, i) => {
        if (block.kind === "h2") {
          return (
            <h2 key={i} className="mt-4 text-base font-bold text-fg">
              {renderInline(block.text, `b${i}`)}
            </h2>
          );
        }
        if (block.kind === "h3") {
          return (
            <h3 key={i} className="mt-2 text-sm font-bold text-fg80">
              {renderInline(block.text, `b${i}`)}
            </h3>
          );
        }
        if (block.kind === "p") {
          return (
            <p key={i} className="text-[14px] leading-[1.8] text-fg72">
              {renderInline(block.text, `b${i}`)}
            </p>
          );
        }

        const isOrdered = block.kind === "ol";
        const ListTag = isOrdered ? "ol" : "ul";
        return (
          <ListTag key={i} className="flex list-none flex-col gap-2 pl-0">
            {block.items.map((item, j) => (
              <li key={j} className="flex gap-2.5 text-[14px] leading-[1.8] text-fg72">
                <span className="flex-none text-fg40">{isOrdered ? `${j + 1}.` : "·"}</span>
                <span>{renderInline(item, `b${i}-${j}`)}</span>
              </li>
            ))}
          </ListTag>
        );
      })}
    </div>
  );
}
