const STEPS = [
  {
    title: "1. GA 속성 ID 확인",
    body: "애널리틱스 → 관리(⚙) → 속성 설정 → 오른쪽 위 '속성 ID'. 측정 ID(G-로 시작)가 아니라 숫자 9~10자리예요.",
  },
  {
    title: "2. 구글 클라우드에서 서비스 계정 만들기",
    body: "console.cloud.google.com → 프로젝트 만들기 → 'API 및 서비스 → 라이브러리'에서 Google Analytics Data API 사용 설정 → 'API 및 서비스 → 사용자 인증 정보 → 서비스 계정 만들기' → 만든 계정의 '키' 탭에서 JSON 키 추가·다운로드.",
  },
  {
    title: "3. GA에 그 서비스 계정을 뷰어로 추가",
    body: "애널리틱스 → 관리 → 속성 액세스 관리 → + → 서비스 계정 이메일(...gserviceaccount.com)을 '뷰어'로 추가.",
  },
  {
    title: "4. Vercel 환경변수 3개 추가 후 재배포",
    body: "다운로드한 JSON 안의 값을 그대로 씁니다.",
  },
];

const ENVS = [
  { key: "GA_PROPERTY_ID", value: "예: 501234567 (숫자만)" },
  { key: "GA_SERVICE_ACCOUNT_EMAIL", value: "JSON 의 client_email 값" },
  { key: "GA_SERVICE_ACCOUNT_KEY", value: "JSON 의 private_key 값 (-----BEGIN PRIVATE KEY----- 부터 통째로)" },
];

const DIMENSIONS = [
  ["content_title", "작품 이름"],
  ["list_name", "어느 목록에서 눌렀는지"],
  ["platform_name", "어느 플랫폼으로 나갔는지"],
  ["content_category", "작품 형식"],
  ["label", "버튼 이름"],
  ["destination", "나간 도메인"],
];

/** GA 연동 전에 보여주는 안내. 설정이 끝나면 이 화면 대신 지표가 나온다. */
export function AnalyticsSetupGuide() {
  return (
    <>
      <h1 className="text-2xl font-extrabold">방문 분석</h1>
      <div className="rounded-[14px] border border-accent-line bg-accent-soft8 px-5 py-4 text-[13px] leading-relaxed text-fg70">
        아직 구글 애널리틱스와 연결되지 않았어요. 아래 4단계를 마치면 이 화면에 방문자·인기 작품·시청처
        전환이 바로 표시됩니다. 사이트의 이벤트 수집은 이미 동작 중이라, 지금 연결해도 그동안 쌓인
        데이터를 볼 수 있어요.
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {STEPS.map((step) => (
          <section
            key={step.title}
            className="flex flex-col gap-2 rounded-[14px] border border-line8 bg-panel px-5 py-[18px]"
          >
            <div className="text-sm font-bold">{step.title}</div>
            <p className="text-[13px] leading-relaxed text-fg55">{step.body}</p>
          </section>
        ))}
      </div>

      <section className="flex flex-col gap-3 rounded-[14px] border border-line8 bg-panel px-5 py-[18px]">
        <div className="text-sm font-bold">Vercel 환경변수</div>
        <table className="w-full border-collapse text-[13px]">
          <tbody>
            {ENVS.map((env) => (
              <tr key={env.key} className="border-t border-[rgba(255,255,255,0.05)]">
                <td className="w-[260px] py-2.5 pr-3 font-mono text-xs text-accent">{env.key}</td>
                <td className="py-2.5 text-fg55">{env.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-[11px] leading-relaxed text-fg40">
          비공개 키는 여러 줄이라 그대로 붙여넣으면 됩니다. 줄바꿈이 깨져 한 줄로 들어가도
          (\n 형태) 알아서 되돌려 읽어요. 저장 후 반드시 재배포해야 적용됩니다.
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-[14px] border border-line8 bg-panel px-5 py-[18px]">
        <div>
          <div className="text-sm font-bold">GA에 맞춤 측정기준 등록 (같이 해두세요)</div>
          <div className="mt-1 text-[11px] leading-relaxed text-fg40">
            애널리틱스 → 관리 → 데이터 표시 → 맞춤 정의 → 맞춤 측정기준 만들기. 범위는 모두
            &quot;이벤트&quot;로 두고, 이벤트 매개변수 이름을 아래와 똑같이 적으세요.
            <strong className="text-fg70"> 등록한 시점 이후에 쌓인 데이터부터</strong> 표에 나옵니다.
          </div>
        </div>
        <table className="w-full border-collapse text-[13px]">
          <tbody>
            {DIMENSIONS.map(([key, label]) => (
              <tr key={key} className="border-t border-[rgba(255,255,255,0.05)]">
                <td className="w-[260px] py-2.5 pr-3 font-mono text-xs text-accent">{key}</td>
                <td className="py-2.5 text-fg55">{label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
