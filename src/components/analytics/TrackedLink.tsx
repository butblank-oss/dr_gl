"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { track } from "@/lib/analytics";

type Params = Record<string, string | number | boolean | undefined>;

type InternalProps = Omit<ComponentProps<typeof Link>, "onClick"> & {
  event: string;
  params?: Params;
  children: ReactNode;
};

/** 사이트 안으로 이동하면서 이벤트를 남기는 링크 */
export function TrackedLink({ event, params, children, ...rest }: InternalProps) {
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
