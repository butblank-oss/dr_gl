/**
 * 제목 한 칸에 두 언어를 같이 적어 온 데이터를 나누는 규칙.
 *
 * `몬스터 (Monster)` 처럼 뒤에 괄호로 붙는 형태만 다룬다. 실제로 쌓인 데이터를 보면
 * 한국어가 앞인 것도, 영어가 앞인 것도 있어서 어느 쪽이 영어인지는 글자를 보고 판단한다.
 * 애매한 형태(`23.5 (지구가 기울어진 각도), 23.5 Degrees`)는 손대지 않고 그대로 둔다 —
 * 잘못 쪼개는 것보다 사람이 어드민에서 고치는 편이 낫다.
 */
export type SplitTitle = { title: string; titleEn: string };

const HANGUL = /[가-힣]/;
const LATIN = /[A-Za-z]/;

/** 라틴 문자가 있고 한글은 없으면 영어 쪽으로 본다. */
function looksEnglish(text: string): boolean {
  return LATIN.test(text) && !HANGUL.test(text);
}

export function splitBilingualTitle(raw: string): SplitTitle {
  const full = raw.trim();

  // 문자열 맨 끝에 붙은 괄호만 본다. 중간에 낀 괄호는 제목의 일부일 수 있다.
  const matched = /^(.*\S)\s*[(（]([^()（）]+)[)）]$/.exec(full);
  if (!matched) {
    // 괄호가 없고 통째로 영어면 그 자체가 영어 제목이다.
    return looksEnglish(full) ? { title: full, titleEn: full } : { title: full, titleEn: "" };
  }

  const outside = matched[1].trim();
  const inside = matched[2].trim();

  if (looksEnglish(inside) && !looksEnglish(outside)) return { title: outside, titleEn: inside };
  if (looksEnglish(outside) && !looksEnglish(inside)) return { title: inside, titleEn: outside };

  // 둘 다 영어이거나 둘 다 한글이면 판단 근거가 없다. 건드리지 않는다.
  return { title: full, titleEn: "" };
}
