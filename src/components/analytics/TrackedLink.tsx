"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { track } from "@/lib/analytics";
import { langFromPath } from "@/lib/i18n";

type Params = Record<string, string | number | boolean | undefined>;

type InternalProps = Omit<ComponentProps<typeof Link>, "onClick"> & {
  event: string;
  params?: Params;
  children: ReactNode;
};

/**
 * 사이트 안으로 이동하면서 이벤트를 남기는 링크.
 *
 * 언어가 걸린 이동만 <a> 로 통째로 새로 연다.
 * /en 은 미들웨어가 주소에서 접두어를 떼어 같은 페이지로 넘기는 구조인데,
 * Next 의 화면 캐시는 "떼어낸 뒤" 주소로 기억한다. 그래서 앱 안에서 부드럽게 이동하면
 * 한국어로 이미 본 화면이 그대로 다시 나온다. 서버를 한 번 더 거치게 해서 이 구멍을 막는다.
 */
export function TrackedLink({ event, params, children, ...rest }: InternalProps) {
  const pathname = usePathname();
  const href = typeof rest.href === "string" ? rest.href : "";
  const crossesLanguage = langFromPath(href) !== langFromPath(pathname);

  if (crossesLanguage) {
    const { href: _href, ...anchorRest } = rest;
    return (
      <a
        {...(anchorRest as ComponentProps<"a">)}
        href={href}
        onClick={() => track(event, params)}
      >
        {children}
      </a>
    );
  }

  return (
    <Link {...rest} onClick={() => track(event, params)}>
      {children}
    </Link>
  );
}

type ExternalProps = Omit<ComponentProps<"a">, "onClick"> & {
  event: string;
  params?: Params;
  children: ReactNode;
};

/** 외부로 나가는 링크. 클릭 순간 이벤트를 남긴다. */
export function TrackedExternalLink({ event, params, children, ...rest }: ExternalProps) {
  return (
    <a {...rest} onClick={() => track(event, params)}>
      {children}
    </a>
  );
}

type ButtonProps = Omit<ComponentProps<"button">, "onClick"> & {
  event: string;
  params?: Params;
  onClick?: () => void;
  children: ReactNode;
};

/** 이벤트를 남기는 버튼 */
export function TrackedButton({ event, params, onClick, children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      onClick={() => {
        track(event, params);
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}
