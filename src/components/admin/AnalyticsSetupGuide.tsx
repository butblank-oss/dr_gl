const STEPS = [
  {
    title: "1. GA 속성 ID 확인",
    body: "애널리틱스 → 관리(⚙) → 속성 세부정보 → 오른쪽 위 '속성 ID'. 측정 ID(G-로 시작)가 아니라 숫자 9~10자리예요. 주소창의 …p548655784… 부분과 같습니다.",
  },
  {
    title: "2. 구글 클라우드에서 서비스 계정 만들기",
    body: "console.cloud.google.com → 'API 및 서비스 → 라이브러리'에서 Google Analytics Data API 사용 설정 → 'IAM 및 관리 → 서비스 계정'에서 계정 생성 → 그 계정의 '키' 탭 → 키 추가 → JSON → 파일 다운로드.",
  },
  {
    title: "3. GA에 그 서비스 계정을 뷰어로 추가",
    body: "애널리틱스 → 관리 → 속성 액세스 관리 → + → 서비스 계정 이메일(...gserviceaccount.com)을 '뷰어'로 추가.",
  },
  {
    title: "4. 아래 '연결 설정'에 붙여넣기",
    body: "다운로드한 JSON 파일을 텍스트편집기로 열어 { 부터 } 까지 전부 복사해 붙여넣고 저장하면 끝입니다. 배포나 환경변수 수정은 필요 없어요.",
  },
];

/** GA 등록 화면의 세 칸(이름·설명·이벤트 매개변수)에 그대로 옮겨 적을 수 있게 나눠 둔다. */
export const GA_DIMENSIONS: { key: string; name: string; desc: string; group: string }[] = [
  { key: "content_title", name: "작품 이름", desc: "작품별 클릭과 시청처 전환을 보기 위한 값", group: "핵심" },
  { key: "platform_name", name: "플랫폼 이름", desc: "어느 플랫폼으로 보러 나갔는지", group: "핵심" },
  { key: "search_term", name: "검색어", desc: "이용자가 검색창에 입력한 말", group: "핵심" },
  { key: "list_name", name: "목록 이름", desc: "홈의 어느 줄에서 작품을 눌렀는지", group: "핵심" },
  { key: "results", name: "검색 결과 수", desc: "결과가 0건이던 검색어를 뽑는 데 씀", group: "핵심" },
  { key: "destination", name: "나간 도메인", desc: "시청처 클릭으로 이동한 사이트 도메인", group: "핵심" },

  { key: "content_category", name: "작품 형식", desc: "영화·드라마·웹툰 등 어떤 형식이 눌리는지", group: "추가 분석" },
  { key: "juice", name: "착즙 여부", desc: "착즙 작품이 일반 작품보다 반응이 좋은지", group: "추가 분석" },
  { key: "label", name: "버튼 이름", desc: "어떤 이동 버튼이 많이 눌리는지", group: "추가 분석" },
  { key: "filter_type", name: "필터 종류", desc: "형식·국가·착즙 중 무엇을 주로 만지는지", group: "추가 분석" },
  { key: "filter_value", name: "고른 필터 값", desc: "그 필터에서 어떤 값을 골랐는지", group: "추가 분석" },
  { key: "percent", name: "스크롤 도달 지점", desc: "화면을 어디까지 읽었는지 (25·50·75·100)", group: "추가 분석" },
  { key: "submit_category", name: "제보된 작품 형식", desc: "이용자가 어떤 형식을 더 제보하는지", group: "추가 분석" },

  { key: "position", name: "카드 순번", desc: "목록에서 몇 번째 카드가 눌리는지", group: "더 파고들 때" },
  { key: "nav_to", name: "이동한 곳", desc: "버튼을 눌러 어느 화면으로 갔는지", group: "더 파고들 때" },
  { key: "nav_from", name: "이동 전 화면", desc: "그 버튼을 어느 화면에서 눌렀는지", group: "더 파고들 때" },
  { key: "nav_source", name: "버튼 위치", desc: "헤더·푸터·제보 폼 중 어디의 버튼인지", group: "더 파고들 때" },
  { key: "cta", name: "히어로 버튼", desc: "상세보기와 시청 가능한 곳 중 어느 쪽인지", group: "더 파고들 때" },
  { key: "submit_country", name: "제보된 국가", desc: "제보된 작품이 국내인지 해외인지", group: "더 파고들 때" },
  { key: "reason", name: "제보 실패 사유", desc: "필수값 누락·서버 거절·네트워크 중 무엇인지", group: "더 파고들 때" },
  { key: "http_status", name: "제보 실패 응답 코드", desc: "서버가 거절할 때의 상태 코드", group: "더 파고들 때" },
];

const GROUPS = ["핵심", "추가 분석", "더 파고들 때"] as const;

/** GA 연동 전에 보여주는 안내. 설정이 끝나면 이 화면 대신 지표가 나온다. */
export function AnalyticsSetupGuide() {
  return (
    <div className="flex flex-col gap-4">
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

      <GaDimensionGuide />
    </div>
  );
}

/** GA에 등록해야 할 맞춤 측정기준 목록. 연결 전후 모두에서 보여준다. */
export function GaDimensionGuide() {
  return (
    <details className="rounded-[14px] border border-line8 bg-panel px-5 py-[18px]" open>
      <summary className="cursor-pointer text-sm font-bold">GA에 등록할 맞춤 측정기준</summary>
      <div className="mt-3 flex flex-col gap-3">
        <div className="text-[11px] leading-relaxed text-fg40">
          애널리틱스 → 관리 → 데이터 표시 → 맞춤 정의 → 맞춤 측정기준 만들기. 범위는 모두
          &quot;이벤트&quot;로 두고, 이벤트 매개변수 이름을 아래와 똑같이 적으세요.
          <strong className="text-fg70"> 등록한 이후에 쌓인 데이터부터</strong> 표에 나옵니다.
        </div>
        {GROUPS.map((group) => (
          <div key={group} className="flex flex-col gap-1">
            <div className="mt-2 text-[11px] font-bold text-fg60">
              {group}
              {group === "핵심" ? (
                <span className="ml-2 font-normal text-fg35">이것부터 넣으면 표가 채워져요</span>
              ) : null}
            </div>
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-[10px] text-fg35">
                  <th className="w-[150px] pb-1 font-semibold">측정기준 이름</th>
                  <th className="pb-1 font-semibold">설명</th>
                  <th className="w-[170px] pb-1 font-semibold">이벤트 매개변수</th>
                </tr>
              </thead>
              <tbody>
                {GA_DIMENSIONS.filter((dimension) => dimension.group === group).map((dimension) => (
                  <tr key={dimension.key} className="border-t border-[rgba(255,255,255,0.05)]">
                    <td className="py-2 pr-3 font-semibold text-fg75">{dimension.name}</td>
                    <td className="py-2 pr-3 text-[12px] text-fg55">{dimension.desc}</td>
                    <td className="py-2 font-mono text-xs text-accent">{dimension.key}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        <div className="text-[11px] leading-relaxed text-fg40">
          측정기준 이름은 아무렇게나 적어도 되고, <strong className="text-fg60">이벤트 매개변수</strong>만
          위와 정확히 같으면 됩니다. 한 줄에 하나씩, <strong className="text-fg60">따로따로</strong>{" "}
          등록하세요 — 매개변수 이름에는 공백이나 · 같은 기호를 넣을 수 없습니다. GA4는 이벤트 범위
          측정기준을 50개까지 만들 수 있어서 전부 넣어도 여유가 있어요.
        </div>
      </div>
    </details>
  );
}
