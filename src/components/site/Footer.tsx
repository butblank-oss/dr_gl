import Link from "next/link";
import { SITE } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line6">
      <div className="page-shell flex flex-col gap-4 py-8">
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
          <Link href="/terms" className="text-fg55 hover:text-fg">
            이용약관
          </Link>
          {/* 개인정보처리방침은 다른 항목보다 눈에 띄게 표시한다 */}
          <Link href="/privacy" className="font-bold text-fg hover:text-fg">
            개인정보처리방침
          </Link>
          <a href={`mailto:${SITE.email}`} className="text-fg55 hover:text-fg">
            문의 · 저작권 삭제 요청
          </a>
        </nav>

        <p className="max-w-[720px] text-xs leading-relaxed text-fg40">
          Dr. GL은 작품을 소개하고 감상처를 안내하는 큐레이션 서비스입니다. 작품을 직접 제작·유통하지 않으며,
          게시된 제목·줄거리·이미지의 권리는 각 저작권자에게 있습니다. 수정이나 삭제가 필요하시면{" "}
          <a href={`mailto:${SITE.email}`} className="text-fg55 underline underline-offset-2">
            {SITE.email}
          </a>
          로 알려주시면 확인 후 신속히 조치하겠습니다.
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-fg32">
          <span>운영 · {SITE.operator}</span>
          <span className="text-fg22">|</span>
          <span>{SITE.email}</span>
          <span className="text-fg22">|</span>
          <span>© 2026 Dr. GL · GL 콘텐츠 큐레이션 플랫폼</span>
        </div>
      </div>
    </footer>
  );
}
