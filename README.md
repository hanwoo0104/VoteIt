# VoteIt 보팃

보팃은 시민이 정치 현안에 대해 4개의 관점을 비교하고, 자신의 의견을 선택한 뒤 AI 스타일 분석과 인구통계 기반 반응을 확인하는 모바일 퍼스트 PWA입니다. 해커톤 시연을 위해 Supabase 키가 없어도 로컬 목 데이터로 전체 플로우가 동작합니다.

## Stack

- Next.js 15 App Router, TypeScript
- TailwindCSS, shadcn/ui 스타일 컴포넌트, Framer Motion
- Zustand, Recharts
- Supabase Auth, Database, Realtime 연동 구조
- PWA manifest, service worker, install prompt, safe-area bottom navigation

## Run

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## Demo Accounts

- 일반 사용자: `010-1234-5678` / `voteit1234!`
- 관리자: `010-0000-0000` / `admin1234!`
- 정치인: `010-9999-9999` / `pol1234!`

회원가입 OTP 더미 코드는 `123456`입니다.

## Supabase Setup

1. Supabase 프로젝트를 만들고 Phone Auth를 활성화합니다.
2. SQL editor에서 `supabase/schema.sql`을 실행합니다.
3. SQL editor에서 `supabase/seed.sql`을 실행합니다.
4. `.env.example`을 참고해 `.env.local`을 만듭니다.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

관리자 계정은 Supabase Auth에서 사용자를 만든 뒤 SQL로 role을 변경합니다.

```sql
update public.users
set role = 'admin'
where phone = '010-0000-0000';
```

## Features

- Supabase Auth 기반 로그인/회원가입 구조와 더미 OTP UI
- 사용자 역할: 일반 사용자, 정치인, 관리자
- 홈: 핫한 주제 카드, 실시간 반응 애니메이션, 하단 탭바
- 상세: 4개 의견 선택, glow 효과, AI 분석 연출, Recharts 통계
- 댓글: 작성, 답글, 좋아요, 최신순/공감순, 신고, 금칙어 필터
- 채팅: 정치인 샘플 계정, 채팅방 목록, 읽음/온라인/마지막 메시지, Supabase Realtime 연결 지점
- 관리자: 현안 추가/수정/삭제, 의견 4개, 장단점, 정치인 연결, 뉴스 링크, 핫이슈/공개 설정, 신고 관리
- PWA: manifest, service worker, install prompt, app icon

## Deploy To Vercel

1. GitHub에 프로젝트를 push합니다.
2. Vercel에서 Import Project를 선택합니다.
3. Environment Variables에 Supabase 값을 등록합니다.
4. Build Command는 `npm run build`, Output은 Next.js 기본값을 사용합니다.

Supabase 키가 비어 있어도 데모 모드로 배포 화면을 확인할 수 있습니다.
