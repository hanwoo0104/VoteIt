# VoteIt 보팃

VoteIt은 일반 시민이 정치 현안을 4개의 관점으로 비교하고, 투표·댓글·정치인 1:1 채팅을 통해 건강하게 의견을 나눌 수 있는 모바일 중심 정치 참여 플랫폼입니다.

이번 버전은 Supabase를 제거하고 로컬 SQLite DB 파일 기반으로 재구성했습니다. 앱 첫 실행 또는 첫 API 요청 시 `data/voteit.sqlite`가 자동 생성되며, 데모 현안/정치인/사용자/관리자 계정이 시드됩니다.

## Stack

- Next.js 15 App Router, TypeScript strict mode
- TailwindCSS, shadcn 스타일 UI 컴포넌트, Framer Motion
- Node 내장 `node:sqlite`
- HTTP-only cookie 기반 로컬 세션
- Zustand auth store
- Recharts
- PWA manifest, service worker, install prompt, safe-area bottom navigation

## Local Run

```bash
npm install
npm run dev
```

기본 주소는 `http://localhost:3000`입니다. 포트 충돌 시:

```bash
npm run dev -- -H 127.0.0.1 -p 3001
```

## SQLite DB

기본 DB 위치:

```text
data/voteit.sqlite
```

앱이 처음 DB에 접근하면 자동으로 아래 작업을 수행합니다.

- SQLite 스키마 생성
- 정치인 4명 시드
- 실제 정치 현안 5개와 각 의견 4개 시드
- 일반 사용자/관리자 데모 계정 생성
- 샘플 투표와 댓글 생성

DB를 초기화하려면:

```bash
npm run db:reset
```

초기화 후 앱을 다시 실행하거나 API에 접근하면 DB가 다시 생성됩니다.

## Environment

Supabase 환경변수는 더 이상 필요하지 않습니다.

`.env.example`을 참고해 선택 옵션만 설정하면 됩니다.

```bash
VOTEIT_SQLITE_PATH=data/voteit.sqlite

# Optional. Empty이면 서버 분석 API가 mockAnalysis로 fallback됩니다.
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

## Auth And OTP

회원가입 흐름:

1. 사용자가 휴대폰 번호를 입력합니다.
2. `/api/auth/otp/request`가 랜덤 6자리 OTP를 생성합니다.
3. OTP hash, 만료 시간, 시도 횟수가 SQLite `phone_verifications`에 저장됩니다.
4. 개발 환경에서는 OTP가 UI 응답과 서버 console에 표시됩니다.
5. `/api/auth/otp/verify`가 만료/시도 횟수/코드를 검증합니다.
6. `/api/auth/signup`이 검증된 OTP만 받아 `users`, `profiles`에 계정을 생성합니다.
7. `/api/auth/login`이 HTTP-only cookie 세션을 발급합니다.

실제 문자 발송은 `services/sms/sendSms.ts`만 CoolSMS, Twilio, Naver SENS 어댑터로 교체하면 됩니다.

## Demo Accounts

DB 생성 시 자동으로 들어가는 일반 사용자:

```text
010-1234-5678
voteit1234!
```

관리자:

```text
010-0000-0000
admin1234!
```

계정 정보를 다시 보려면:

```bash
npm run seed:demo-user
npm run seed:admin-user
```

## Data Model

SQLite 테이블:

- `users`, `profiles`, `sessions`, `phone_verifications`
- `issues`, `issue_options`, `issue_votes`, `issue_views`
- `comments`, `comment_likes`, `reports`
- `politicians`, `chats`, `chat_messages`
- `news_links`, `issue_option_politicians`

투표/댓글/좋아요/조회수/채팅 카운터는 `services/sqlite/db.ts`의 transaction 함수에서 즉시 갱신됩니다.

## Features

- SQLite 기반 회원가입/로그인/로그아웃
- OTP 생성/저장/만료/검증/재전송
- Role 기반 일반 사용자/관리자 분리
- 현안 목록/상세, 의견 4개, 투표 저장, 통계 계산
- Recharts 기반 연령/성별/지역/소득 통계
- 댓글 작성, 답글, 수정, 삭제, 좋아요, 신고, 최신순/공감순
- 정치인 1:1 채팅
- 관리자 현안 CRUD, 뉴스 링크, 정치인 연결, 신고 관리, 통계
- AI 분석 abstraction: `mockAnalysis` fallback + `/api/ai/analysis` OpenAI 연결 구조
- PWA, safe-area, bottom navigation, skeleton/error/empty states

## Verification

```bash
npm run typecheck
npm run lint
npm run build
```

