"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SpinnerIcon } from "@/components/icons";
import { ApiError, api } from "@/lib/client-api";

type Props = {
  /** 이미 연결돼 있는지 — 열린 상태로 시작할지 정한다 */
  ready: boolean;
  propertyId: string;
  clientEmail: string;
  canEdit: boolean;
};

/**
 * 방문 분석 연결 설정.
 * 서비스 계정 JSON 파일 내용을 그대로 붙여넣으면 끝난다. 재배포가 필요 없다.
 */
export function GaConnectForm({ ready, propertyId, clientEmail, canEdit }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(!ready);
  const [property, setProperty] = useState(propertyId);
  const [credentials, setCredentials] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!canEdit) {
    return (
      <div className="rounded-[14px] border border-line8 bg-panel px-5 py-4 text-[13px] text-fg55">
        방문 분석 연결 설정은 슈퍼관리자만 변경할 수 있어요.
      </div>
    );
  }

  const save = async () => {
    setPending(true);
    setError("");
    try {
      await api("/api/settings/ga", {
        method: "PUT",
        body: JSON.stringify({ propertyId: property, credentials }),
      });
      setCredentials("");
      setDone(true);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "저장하지 못했어요.");
    } finally {
      setPending(false);
    }
  };

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-line8 bg-panel px-5 py-4">
        <div className="text-[13px] text-fg55">
          {done ? "저장했어요. " : ""}
          연결된 서비스 계정 · <span className="text-fg80">{clientEmail || "(없음)"}</span>
          {propertyId ? <span className="text-fg35"> · 속성 {propertyId}</span> : null}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-ghost px-4 py-2 text-xs text-fg70"
        >
          연결 설정 변경
        </button>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-[14px] border border-line8 bg-panel px-5 py-[18px]">
      <div>
        <div className="text-sm font-bold">연결 설정</div>
        <div className="mt-1 text-[11px] leading-relaxed text-fg40">
          여기에 넣으면 재배포 없이 바로 반영돼요. 키는 저장 후 다시 보이지 않습니다.
        </div>
      </div>

      <label className="flex flex-col gap-[7px]">
        <span className="text-xs font-semibold text-fg70">
          GA 속성 ID <span className="font-normal text-fg40">(숫자. 측정 ID G-... 가 아니에요)</span>
        </span>
        <input
          value={property}
          onChange={(e) => setProperty(e.target.value)}
          placeholder="예: 548655784"
          className="field h-[42px] px-[13px] text-[13px]"
        />
        <span className="text-[11px] text-fg35">
          애널리틱스 → 관리 → 속성 세부정보 오른쪽 위에 있어요. 주소창의 …p548655784… 부분과 같습니다.
        </span>
      </label>

      <label className="flex flex-col gap-[7px]">
        <span className="text-xs font-semibold text-fg70">서비스 계정 JSON</span>
        <textarea
          value={credentials}
          onChange={(e) => setCredentials(e.target.value)}
          placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key": "-----BEGIN PRIVATE KEY-----\\n...",\n  "client_email": "...@....iam.gserviceaccount.com"\n}'}
          spellCheck={false}
          className="field h-[180px] resize-none px-[13px] py-3 font-mono text-[11px] leading-relaxed"
        />
        <span className="text-[11px] leading-relaxed text-fg35">
          다운로드한 JSON 파일을 텍스트편집기로 열어 <strong className="text-fg55">{"{"} 부터 {"}"} 까지 전부</strong>{" "}
          복사해 붙여넣으세요. 일부만 잘라내지 않아도 됩니다.
        </span>
      </label>

      {error ? <div className="text-[13px] text-danger">{error}</div> : null}

      <div className="flex justify-end gap-2.5">
        {ready ? (
          <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-5 py-[11px] text-[13px]">
            취소
          </button>
        ) : null}
        <button
          type="button"
          onClick={save}
          disabled={pending || !property.trim() || !credentials.trim()}
          className="btn-grad px-[22px] py-[11px] text-[13px]"
        >
          {pending ? <SpinnerIcon /> : "저장하고 연결"}
        </button>
      </div>
    </section>
  );
}
