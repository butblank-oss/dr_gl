# 배포하기 — Vercel + Neon (무료)

인터넷 주소로 접속해서 쓰려면 두 가지가 필요해요.

- **데이터베이스** — 콘텐츠·제보·한줄평이 저장될 곳 → **Neon** (무료 Postgres)
- **서버** — 사이트와 어드민을 돌릴 곳 → **Vercel** (무료)

둘 다 GitHub 계정으로 가입되고, 카드 등록 없이 시작할 수 있어요.
터미널이나 명령어는 한 줄도 필요 없습니다. 전부 브라우저에서 클릭으로 끝나요.

> 이 프로젝트는 **정적 사이트가 아니라 DB를 읽고 쓰는 동적 사이트**예요.
> 그래서 GitHub Pages 같은 정적 호스팅에는 올릴 수 없고, 서버가 도는 Vercel 같은 곳이 필요합니다.

---

## 1단계 — 데이터베이스 만들기 (Neon)

1. https://neon.tech 접속 → **Sign up** → **Continue with GitHub**
2. 프로젝트 생성 화면에서
   - Project name: `dr-gl`
   - Postgres version: 기본값 그대로
   - Region: **Asia Pacific (Singapore)** 또는 가까운 지역
   - **Create project** 클릭
3. 생성되면 **Connection string** 이 보여요. 여기서 **두 개**를 각각 복사해 메모장에 붙여둡니다.
   - **Pooled connection** (주소에 `-pooler` 가 들어있는 것) → 이걸 `DATABASE_URL` 로 쓸 거예요
   - **Direct connection** (`-pooler` 가 없는 것) → 이걸 `DIRECT_URL` 로 쓸 거예요

   > 화면에 하나만 보이면 연결 문자열 위의 드롭다운에서 `Pooled connection` / `Direct connection` 을 번갈아 선택하면 됩니다.
   > 둘 다 `postgresql://` 로 시작하는 긴 문자열이에요.

---

## 2단계 — 비밀 키 만들기

어드민 로그인 세션에 서명할 키예요. 아무거나 길고 무작위면 됩니다.

- https://generate-secret.vercel.app/32 에 접속하면 나오는 문자열을 복사해서 메모장에 붙여두세요.
- 이게 `AUTH_SECRET` 값이 됩니다.

---

## 3단계 — Vercel에 올리기

1. https://vercel.com 접속 → **Sign up** → **Continue with GitHub**
2. **Add New...** → **Project**
3. 저장소 목록에서 **`butblank-oss/dr_gl`** 옆의 **Import** 클릭
   - 목록에 없으면 **Adjust GitHub App Permissions** 를 눌러 이 저장소에 접근 권한을 주세요.
4. **Framework Preset** 이 `Next.js` 로 자동 인식되는지만 확인하고, 나머지 빌드 설정은 건드리지 마세요.
5. **Environment Variables** 를 펼쳐서 아래 5개를 하나씩 추가합니다. (Name / Value 를 넣고 **Add** 반복)

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | 1단계에서 복사한 **Pooled** 연결 문자열 |
   | `DIRECT_URL` | 1단계에서 복사한 **Direct** 연결 문자열 |
   | `AUTH_SECRET` | 2단계에서 만든 무작위 문자열 |
   | `SEED_ADMIN_EMAIL` | 어드민 로그인에 쓸 이메일 (예: `but.blank@gmail.com`) |
   | `SEED_ADMIN_PASSWORD` | 어드민 로그인에 쓸 비밀번호 (직접 정하세요) |

6. **Deploy** 클릭 → 2~3분 기다립니다.

빌드가 도는 동안 자동으로 처리되는 것들이에요. 따로 하실 게 없습니다.
- 데이터베이스 테이블 생성 (마이그레이션)
- 시드 데이터 넣기 (콘텐츠 18개, 카테고리 7개, 홈 큐레이션 4줄, 데모 한줄평 5개)
- 어드민 계정 생성 (위에 적은 이메일/비밀번호로)

---

## 4단계 — 접속 확인

배포가 끝나면 `https://dr-gl-....vercel.app` 같은 주소가 나와요.

1. 그 주소로 들어가면 **사이트**입니다. 홈에 히어로 배너와 가로 스크롤 행이 보이면 성공.
2. 주소 뒤에 `/admin` 을 붙이면 **어드민 로그인**이에요.
   - 5단계에서 넣은 `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` 로 로그인
3. 잘 도는지 한 바퀴 확인하는 순서
   - 사이트 헤더의 **+ 제보하기** 로 아무 작품이나 제보
   - 어드민 → **제보 검토** 에 방금 제보가 떠 있음
   - **검토 · 발행** → 내용 채우고 **승인 및 발행**
   - 사이트로 돌아와 검색하면 방금 발행한 콘텐츠가 바로 보임

여기까지 되면 사이트와 어드민이 같은 DB를 보고 있다는 게 확인된 거예요.

---

## 이후 운영

- **코드가 바뀌면**: GitHub 기본 브랜치에 푸시될 때마다 Vercel이 자동으로 새로 배포해요. 누를 버튼 없습니다.
- **데이터는 유지됩니다**: 재배포해도 시드가 덮어쓰지 않아요. 콘텐츠가 이미 있으면 데모 시드는 건너뜁니다.
- **비밀번호를 바꾸려면**: Vercel 환경변수만 바꾸는 걸로는 안 바뀌어요(이미 만들어진 계정을 덮어쓰지 않음).
  Neon 콘솔에서 `AdminUser` 행을 지우고 재배포하면 새 비밀번호로 다시 만들어집니다.
- **포스터 이미지**: Vercel은 디스크에 파일을 못 써서 이미지를 DB에 저장해요(자동으로 그렇게 동작합니다).
  이미지가 많아져 Neon 무료 용량(0.5GB)이 부담되면 S3·Cloudflare R2로 바꿀 수 있어요 —
  `STORAGE_DRIVER=s3` 와 `S3_*` 환경변수만 채우면 코드 수정 없이 전환됩니다.

---

## 커스텀 도메인 (선택)

가지고 계신 도메인이 있다면 Vercel 프로젝트 → **Settings** → **Domains** 에서 추가하고,
안내되는 DNS 레코드를 도메인 등록기관에 넣으면 됩니다.

---

## 문제가 생기면

| 증상 | 원인·해결 |
|---|---|
| 빌드 실패, 로그에 `Can't reach database server` | `DATABASE_URL` / `DIRECT_URL` 오타. Neon에서 다시 복사해 붙여넣기 |
| 빌드 실패, 로그에 `AUTH_SECRET` | `AUTH_SECRET` 을 안 넣었거나 너무 짧음 (16자 이상) |
| 사이트는 뜨는데 홈이 비어 있음 | 시드가 안 돈 것. Vercel → Deployments → 최신 배포 → **Redeploy** |
| `/admin` 에서 로그인이 안 됨 | `SEED_ADMIN_EMAIL` 대소문자 확인. 그래도 안 되면 위 "비밀번호를 바꾸려면" 참고 |
| 이미지 업로드 실패 | Vercel 환경변수에 `STORAGE_DRIVER=db` 를 명시적으로 추가하고 재배포 |
