# VoteIt 보팃

VoteIt은 일반 시민이 정치 현안을 4개의 관점으로 비교하고, 투표·댓글·정치인 1:1 채팅을 통해 건강하게 의견을 나눌 수 있는 모바일 중심 정치 참여 플랫폼입니다.

이번 버전은 기존 UI-only 데모를 Supabase 기반 MVP 구조로 재구성했습니다. Supabase 환경변수가 설정되면 회원가입, OTP 검증, 로그인, 투표 저장, 통계 계산, 댓글, 좋아요, 신고, 실시간 채팅, 관리자 CRUD가 실제 DB에 저장됩니다.

## Stack

- Next.js 15 App Router, TypeScript strict mode
- TailwindCSS, shadcn 스타일 UI 컴포넌트, Framer Motion
- Supabase Auth, Postgres, RLS, Realtime
- Zustand Auth session bridge
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

## Environment

`.env.example`을 복사해 `.env.local`을 만듭니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
OTP_HASH_SECRET=change-this-long-random-secret

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

`SUPABASE_SERVICE_ROLE_KEY`는 OTP 저장/검증과 Auth user 생성 API route에서만 서버 측으로 사용됩니다. 브라우저에 노출하지 마세요.

## Supabase Setup

1. Supabase 프로젝트를 생성합니다.
2. SQL editor에서 `supabase/schema.sql`을 실행합니다.
3. SQL editor에서 `supabase/seed.sql`을 실행합니다.
4. Authentication의 Site URL을 로컬/배포 URL로 설정합니다.
5. Realtime이 필요한 테이블은 schema에서 publication에 추가됩니다.

이미 안내받은 SQL로 `auth.users`에 계정을 직접 넣었다면, SQL editor에서 `supabase/fix-auth-trigger.sql`을 한 번 실행한 뒤 아래 데모 계정 스크립트를 실행하세요. Supabase Auth 계정은 SQL insert가 아니라 Admin API로 생성해야 안전합니다.

## Auth And OTP

회원가입 흐름:

1. 사용자가 휴대폰 번호를 입력합니다.
2. `/api/auth/otp/request`가 랜덤 6자리 OTP를 생성합니다.
3. OTP hash, 만료 시간, 시도 횟수가 `phone_verifications`에 저장됩니다.
4. 개발 환경에서는 OTP가 UI 응답과 서버 console에 표시됩니다.
5. `/api/auth/otp/verify`가 만료/시도 횟수/코드를 검증합니다.
6. `/api/auth/signup`이 검증된 OTP만 받아 Supabase Auth 사용자를 생성합니다.
7. 클라이언트가 Supabase Auth로 로그인해 JWT 세션을 유지합니다.

실제 문자 발송은 `services/sms/sendSms.ts`만 CoolSMS, Twilio, Naver SENS 어댑터로 교체하면 됩니다.

## Demo Accounts

SQL editor에서 `supabase/schema.sql`, `supabase/seed.sql`을 실행한 뒤 로컬에서 아래 명령으로 일반 사용자 계정을 만듭니다.

```bash
npm run seed:demo-user
```

기본 로그인 정보:

```text
010-1234-5678
voteit1234!
```

관리자 계정은 아래 명령으로 만듭니다.

```bash
npm run seed:admin-user
```

관리자 로그인 정보:

```text
010-0000-0000
admin1234!
```

다른 계정이 필요하면 인자를 넘길 수 있습니다.

```bash
npm run seed:demo-user -- --phone=010-9999-9999 --password=voteit1234! --role=user --nickname=새시민
```

관리자 계정은 `--role=admin`, 정치인 계정은 `--role=politician`으로 만들 수 있습니다.

## Admin Account

관리자 페이지에 접근하려면 `npm run seed:admin-user`로 만든 계정으로 로그인합니다. 이 계정은 Supabase Auth와 `public.users.role = 'admin'`이 함께 생성됩니다.

정치인 계정도 같은 방식으로 role을 바꾼 뒤 `politicians.user_id`에 연결하면 됩니다.

```sql
update public.users
set role = 'politician'
where phone = '01099999999';

update public.politicians
set user_id = (
  select id from public.users where phone = '01099999999'
)
where name = '박서연';
```

## Data Model

필수 테이블:

- `users`, `profiles`, `phone_verifications`
- `issues`, `issue_options`, `issue_votes`, `issue_views`
- `comments`, `comment_likes`, `reports`
- `politicians`, `chats`, `chat_messages`
- `news_links`

트리거:

- 투표 변경 시 현안 참여 수, 의견별 vote count/percent 갱신
- 조회 생성 시 issue views 증가
- 댓글 생성/삭제 시 comments count 갱신
- 댓글 좋아요 변경 시 likes count 갱신
- 채팅 메시지 생성 시 마지막 메시지/읽지 않음 수 갱신

RPC:

- `get_issue_statistics(issue_id)`가 투표자의 연령/성별/지역/소득 통계를 익명 집계로 반환합니다.

## Features

- 실제 Supabase Auth 기반 회원가입/로그인/로그아웃
- 자체 OTP 생성/저장/만료/검증/재전송
- Role 기반 일반 사용자/정치인/관리자 분리
- 현안 목록/상세, 의견 4개, 투표 저장, 실시간 반영
- Recharts 기반 사용자 통계
- 댓글 작성, 답글, 좋아요, 신고, 최신순/공감순
- Supabase Realtime 기반 정치인 1:1 채팅
- 관리자 현안 CRUD, 뉴스 링크, 정치인 연결, 신고 관리, 통계
- AI 분석 abstraction: `mockAnalysis` fallback + `/api/ai/analysis` OpenAI 연결 구조
- PWA, safe-area, bottom navigation, skeleton/error/empty states

## Verification

```bash
npm run typecheck
npm run lint
npm run build
```

현재 위 세 명령이 모두 통과합니다.
