# Dr. GL — GL 콘텐츠 큐레이션 플랫폼

영화·드라마(국내/해외)·웹툰·웹소설·소설·애니·만화 등 GL(백합) 콘텐츠를 한곳에 모아 소개·추천하고,
어디서 볼 수 있는지 연결해주는 콘텐츠 큐레이션 플랫폼입니다.
**사이트(이용자용)** 와 **어드민(운영자용)** 이 같은 데이터베이스를 보고 있어서, 어드민에서 승인·수정한
내용이 사이트에 즉시 반영됩니다.

디자인 핸드오프(`Dr GL.dc.html`, `Dr GL Admin.dc.html`, `ContentCard.dc.html`)의 화면 구성·카피·인터랙션·
디자인 토큰을 그대로 옮기되, 프로토타입이 임시 저장소로 쓰던 `localStorage` + `storage` 이벤트 +
`<image-slot>` 조합은 **전부 실제 백엔드 API + Postgres + 파일 스토리지로 교체**했습니다.

## 스택

| | |
|---|---|
| 프레임워크 | Next.js 16 (App Router) + React 19 + TypeScript |
| 스타일 | Tailwind CSS v4 (`src/app/globals.css` 의 `@theme` 에 디자인 토큰 정의) |
| DB | PostgreSQL + Prisma |
| 인증 | 이메일·비밀번호(bcrypt) + HttpOnly 쿠키 세션(JWT, `jose`) + 역할 기반 권한 |
| 스토리지 | 로컬 디스크(기본) / S3 호환 버킷 (`STORAGE_DRIVER` 로 전환) |
| 검증 | zod (모든 쓰기 API 입력) |

> **정적 사이트가 아닙니다.** 모든 페이지가 요청마다 DB를 읽어 서버에서 렌더되고(`force-dynamic`),
> 제보·한줄평·콘텐츠 편집이 전부 API를 거쳐 DB에 기록됩니다. GitHub Pages 같은 정적 호스팅에는 올릴 수 없고,
> 서버가 도는 환경(Vercel 등)이 필요해요. 배포 절차는 [DEPLOY.md](./DEPLOY.md) 를 보세요.

## 빠르게 실행해보기

Node 20+ 와 Docker 만 있으면 됩니다.

```bash
cp .env.example .env      # 기본값 그대로 두면 아래 docker compose 의 DB에 붙습니다
docker compose up -d      # Postgres 16 기동 (5432)
npm install
npm run setup             # 마이그레이션 + 시드(콘텐츠 18개, 카테고리 7개, 홈 큐레이션, 운영자 계정)
npm run dev
```

- 사이트: http://localhost:3000
- 어드민: http://localhost:3000/admin
- 시드 운영자 계정: `admin@drgl.local` / `drgl-admin-1234` (`.env` 의 `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` 로 변경)

이미 쓰고 있는 Postgres가 있다면 `docker compose` 대신 `.env` 의 `DATABASE_URL` 만 바꾸면 됩니다.
운영 배포 시에는 `AUTH_SECRET` 을 반드시 긴 랜덤 문자열로 교체하세요 (`openssl rand -hex 32`).

### 둘러볼 순서 추천

1. 홈에서 히어로 배너와 가로 스크롤 행 → 카드 클릭해 상세로
2. 상세에서 한줄평 남겨보기, "{배우명}의 다른 작품" 확인 (예: `/content/4` ↔ `/content/12` 는 배우 "진세은"을 공유)
3. 헤더 "+ 제보하기" 로 아무 작품이나 제보
4. `/admin` 로그인 → "제보 검토" 에 방금 제보가 떠 있음 → **검토 · 발행** → 저장
5. 사이트로 돌아와 검색하면 방금 발행한 콘텐츠가 바로 보임

## 화면

### 사이트 (이용자용)

| 라우트 | 내용 |
|---|---|
| `/` | 히어로 배너(추천 콘텐츠 1개) + 가로 스크롤 행 여러 개(어드민에서 큐레이션). 빈 행은 자동으로 숨김 |
| `/category` | 형식 필터(동적 카테고리) + 국가 필터 + "착즙만 보기" 토글 + 반응형 그리드. 필터 상태가 URL에 남아 공유 가능 |
| `/search?q=` | 제목·제작자·카테고리·태그 검색. 검색어가 없으면 추천 태그 칩 노출 |
| `/content/[id]` | 배경 배너, 줄거리, 출연 pill, 태그, "이런 작품은 어때요?", "{배우명}의 다른 작품"(출연진 교차 추천), 한줄평, "시청·감상 가능한 곳"(URL 있으면 새 탭) |
| `/submit` | 콘텐츠 제보 폼 → 제보 큐(`pending`)에 저장 후 "제보 완료! 검토 후 등록할게요" 안내로 전환 |
| `/board` | 게시판 오픈 전 안내 + 오픈 알림 이메일 신청 |

프로토타입의 딥링크 `?detail=<id>` 는 `/content/<id>` 로 자동 리다이렉트됩니다.

### 어드민 (운영자용)

| 라우트 | 내용 |
|---|---|
| `/admin` | 통계 카드 4개(전체 콘텐츠 / 대기 제보 / 노출 한줄평 / 카테고리 수) + 최근 제보·한줄평 미리보기 |
| `/admin/content` | 검색·카테고리·착즙 필터 + 테이블 + 추가/수정 모달(포스터·배경 이미지 업로드 포함) + 삭제(확인 모달) |
| `/admin/home-rows` | 홈 히어로 배너 지정 + 가로 스크롤 행 추가·이름변경·순서변경·노출토글·삭제, 행별 콘텐츠 담기/빼기/순서변경 |
| `/admin/categories` | 추가(중복 방지) / 이름변경(연관 콘텐츠 cascade) / 삭제(사용 중이면 차단) + "착즙은 카테고리가 아니다" 안내 |
| `/admin/submissions` | 필터 탭(대기중·승인됨·반려됨·전체) + "검토 · 발행"(콘텐츠 추가/수정과 동일한 폼을 제보 데이터로 프리필 + 제보 원본 참고 패널) / "반려" |
| `/admin/comments` | 필터 탭(전체·노출중·숨김) + 작성 시각 + 사이트 상세로 가는 새 탭 링크 + 노출/숨김 토글 + 삭제 |
| `/admin/accounts` | **슈퍼관리자 전용.** 운영자 계정 생성·역할 변경·비밀번호 재설정·비활성화·삭제 |

## 데이터 모델

`prisma/schema.prisma` — 핸드오프 문서의 "데이터 스키마" 섹션을 그대로 옮겼습니다.

- **Content** — `leads: String[]`, `tags: String[]`, `platforms: Json`(`{name, type:'무료'|'유료', url}[]`),
  `juice`, `poster` 등. 실제 이미지용으로 `posterUrl` / `backdropUrl` 을 추가했습니다.
- **Category** — `{id, name, sortOrder}`. `name` 이 곧 `Content.category` 의 값이라 이름 변경 시 트랜잭션으로 cascade 갱신합니다.
- **Submission** — `status: pending | approved | rejected`, 발행되면 `contentId` 로 결과 콘텐츠를 가리킵니다.
- **Comment** — 플랫 구조, `itemId` 로 콘텐츠와 연결. 로그인 정보 없음(익명). `status: visible | hidden`,
  rate limit 용 `ipHash`(원본 IP는 저장하지 않음).
- **HomeRow / HomeRowItem** — 홈 가로 스크롤 행 큐레이션.
- **SiteSetting** — `featuredId`(히어로 배너 콘텐츠).
- **AdminUser** — 운영자 계정. `role: ADMIN`(슈퍼관리자, 계정 관리까지) / `EDITOR`(운영자, 계정 관리 외 전부).
  비활성화하면 로그인은 물론 이미 열려 있던 세션도 다음 요청부터 막힌다.
- **NotifySignup** — 게시판 오픈 알림 신청.

## API

모든 쓰기 요청은 zod 로 검증하고, 실패 시 한국어 메시지를 JSON `{ error }` 로 돌려줍니다.

| 엔드포인트 | 권한 | 설명 |
|---|---|---|
| `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` | 공개 | 어드민 세션 |
| `GET /api/content` | 공개 | 목록·필터·검색 |
| `POST /api/content`, `PATCH /api/content/:id` | 운영자 | 콘텐츠 생성·수정 |
| `DELETE /api/content/:id` | 운영자 | 콘텐츠 삭제 |
| `GET /api/categories` | 공개 | 카테고리 + 사용 중인 콘텐츠 수 |
| `POST /api/categories` · `PATCH /api/categories/:id` | 운영자 | 추가(중복 409) · 이름변경(cascade) |
| `DELETE /api/categories/:id` | 운영자 | 사용 중이면 409 + 걸린 콘텐츠 수 반환 |
| `POST /api/submissions` | 공개 | 사이트 제보 폼 |
| `GET /api/submissions` · `PATCH /api/submissions/:id` | 운영자 | 목록 · 상태 변경 |
| `POST /api/submissions/:id/publish` | 운영자 | **콘텐츠 생성 + 제보 승인을 한 트랜잭션으로 처리** |
| `GET /api/comments?itemId=` · `POST /api/comments` | 공개 | 노출중 한줄평 조회 · 익명 작성(rate limit) |
| `PATCH /api/comments/:id` | 운영자 | 노출/숨김 토글 |
| `DELETE /api/comments/:id` | 운영자 | 영구 삭제 |
| `POST /api/uploads` | 운영자 | 이미지 업로드(5MB, jpg/png/webp/gif/avif) |
| `GET /api/home-rows` · `POST` · `PATCH /:id` · `DELETE /:id` | 운영자 | 홈 큐레이션 |
| `PUT /api/settings/featured` | 운영자 | 히어로 배너 콘텐츠 지정 |
| `POST /api/notify` | 공개 | 게시판 오픈 알림 신청 |
| `GET/POST /api/admins`, `PATCH/DELETE /api/admins/:id` | **슈퍼관리자** | 운영자 계정 관리 |
| `PATCH /api/admins/me/password` | 로그인한 본인 | 내 비밀번호 변경 |
| `GET /media/*` | 공개 | 로컬 스토리지 이미지 서빙 |

## 프로토타입에서 교체한 것

| 프로토타입 | 이 구현 |
|---|---|
| `localStorage` 키 `drgl_store_v1` 공유 | Postgres + Prisma. 모든 페이지가 `force-dynamic` 이라 요청마다 최신 데이터를 읽음 |
| 다른 탭 동기화용 `storage` 이벤트 | 서버가 단일 진실 공급원이라 기기·브라우저가 달라도 동일하게 반영 |
| `<image-slot>` sidecar 업로드 | `POST /api/uploads` → 로컬 디스크 또는 S3 호환 버킷. 저장된 URL을 `Content.posterUrl` / `backdropUrl` 에 기록 |
| 어드민 인증 없음 | 로그인 필수 + 역할 기반 권한(슈퍼관리자/운영자) + `/admin/*` 미들웨어 가드 + 어드민 안에서 계정 관리 |
| 한줄평 무제한 작성 | IP 해시 기준 rate limit (기본 10분에 5건, `.env` 로 조정) |
| 콘텐츠 생성과 제보 승인이 별개 state 갱신 | `POST /api/submissions/:id/publish` 한 트랜잭션. 중복 승인은 409 |
| `window.confirm()` | 자체 확인 모달 + 결과 토스트 |
| 로딩·에러 상태 없음 | 모든 CRUD 액션에 로딩 스피너 + 실패 토스트/인라인 에러 |

## 이미지 스토리지 전환

기본값은 로컬 디스크입니다. 업로드 파일은 `UPLOAD_DIR`(기본 `./uploads`)에 저장되고 `/media/*` 라우트로
서빙됩니다. `public/` 이 아니라 별도 디렉터리를 쓰는 이유는, `next start` 가 `public/` 을 빌드 시점
스냅샷으로 다루기 때문에 런타임에 추가된 파일을 내보내지 못해서입니다.

S3(또는 R2·MinIO 등 S3 호환 스토리지)로 바꾸려면 `.env` 에서:

```
STORAGE_DRIVER="s3"
S3_BUCKET="..."
S3_REGION="ap-northeast-2"
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."
S3_ENDPOINT=""            # S3 호환 스토리지면 엔드포인트 지정
S3_PUBLIC_BASE_URL=""     # CDN 도메인이 있으면 지정
```

이 경우 `Content.posterUrl` 에 버킷 URL이 직접 저장되고 `/media/*` 라우트는 쓰이지 않습니다.

## 스크립트

```bash
npm run dev        # 개발 서버
npm run build      # prisma generate + next build
npm start          # 프로덕션 서버
npm run typecheck  # tsc --noEmit
npm run db:migrate # prisma migrate dev
npm run db:seed    # 시드 데이터
```
