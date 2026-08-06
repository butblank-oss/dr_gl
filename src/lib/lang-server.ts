import "server-only";

import { headers } from "next/headers";
import { DEFAULT_LANG, isLang, type Lang } from "@/lib/i18n";

/** 미들웨어가 /en 요청에 붙여주는 표식. 서버 컴포넌트는 이 값만 보면 된다. */
export const LANG_HEADER = "x-drgl-lang";

export async function currentLang(): Promise<Lang> {
  const value = (await headers()).get(LANG_HEADER);
  return isLang(value) ? value : DEFAULT_LANG;
}
