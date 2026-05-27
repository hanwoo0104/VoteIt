# VoteIt Audit

## 기존 문제

- 홈, 상세, 토론, 채팅, 관리자 화면이 `services/data/mockData.ts`에 의존했습니다.
- 인증은 로컬 demo profile과 `local-session-*` 문자열로 성공 처리되었습니다.
- OTP는 고정값 `123456` 더미 검증이었습니다.
- 투표, 댓글, 좋아요, 신고, 채팅, 관리자 CRUD가 Zustand localStorage 또는 컴포넌트 state에만 저장되었습니다.
- 채팅은 실시간 구독 함수가 있었지만 실제 메시지 저장/구독과 연결되지 않았습니다.
- 관리자 페이지는 DB 저장 없이 화면 안 state만 수정했습니다.
- 통계는 실제 투표자 기반 계산이 아니라 hardcoded 더미 데이터였습니다.
- 로딩/오류/빈 상태 공통 컴포넌트가 부족했습니다.

## 변경 결과

- Supabase Auth + 자체 OTP API route 기반 가입 플로우로 변경했습니다.
- `users`, `profiles`, `phone_verifications`로 인증/프로필/검증 상태를 분리했습니다.
- 현안, 의견, 투표, 조회, 댓글, 좋아요, 신고, 정치인, 채팅, 메시지, 뉴스 링크를 Supabase CRUD 서비스로 연결했습니다.
- 투표/댓글/채팅 관련 카운트는 Postgres trigger로 갱신합니다.
- `get_issue_statistics` RPC로 실제 투표자 익명 통계를 계산합니다.
- 채팅은 Supabase Realtime insert subscription으로 실시간 반영합니다.
- 관리자 페이지는 실제 DB upsert/delete/report resolve 서비스를 사용합니다.
- `Skeleton`, `ShimmerLoader`, `EmptyState`, `ErrorState`, `Modal`을 공통 UI로 추가했습니다.
- AI는 `services/ai/mockAnalysis.ts`와 `services/ai/generateAnalysis.ts`, `/api/ai/analysis`로 분리했습니다.
