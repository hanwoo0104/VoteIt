import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import type {
  AgeGroup,
  BreakdownPoint,
  ChatMessage,
  ChatRoom,
  Comment,
  CommentSort,
  Gender,
  IncomeLevel,
  Issue,
  IssueOption,
  IssueStatistics,
  NewsLink,
  Politician,
  UserProfile,
  UserRole
} from "@/types";

type SQLiteValue = string | number | bigint | null;
type SQLiteParams = Record<string, SQLiteValue>;

const dbPath = process.env.VOTEIT_SQLITE_PATH ?? join(process.cwd(), "data", "voteit.sqlite");
const SESSION_DAYS = 30;

let db: DatabaseSync | null = null;

export interface SignUpInput {
  name: string;
  nickname: string;
  phone: string;
  password: string;
  gender: Gender;
  ageGroup: AgeGroup;
  region: string;
  incomeLevel: IncomeLevel;
  verificationId: string;
}

export interface AdminIssueOptionInput {
  id?: string;
  title: string;
  shortText: string;
  partyAlignment: string;
  difference: string;
  pros: string[];
  cons: string[];
  politicianId?: string;
}

export interface AdminIssueInput {
  id?: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  hot: boolean;
  published: boolean;
  newsTitle: string;
  newsOutlet: string;
  newsUrl: string;
  options: AdminIssueOptionInput[];
}

export interface AdminPoliticianInput {
  name: string;
  phone: string;
  password: string;
  party: string;
  roleTitle: string;
  region: string;
  avatarUrl?: string;
  tags?: string[];
}

interface UserRow {
  id: string;
  phone: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
}

interface ProfileRow {
  id: string;
  name: string;
  nickname: string;
  gender: Gender;
  age_group: AgeGroup;
  region: string;
  income_level: IncomeLevel;
  avatar_url: string | null;
}

interface IssueRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  hot: number;
  published: number;
  views: number;
  participants: number;
  comments_count: number;
  reaction_count: number;
  created_at: string;
}

interface OptionRow {
  id: string;
  issue_id: string;
  title: string;
  short_text: string;
  gradient: string | null;
  party_alignment: string | null;
  difference: string | null;
  pros: string | null;
  cons: string | null;
  votes_count: number;
  percent: number;
  sort_order: number;
}

interface NewsRow {
  id: string;
  title: string;
  outlet: string;
  url: string;
}

interface CommentRow {
  id: string;
  issue_id: string;
  parent_id: string | null;
  user_id: string;
  body: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
  name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  role: UserRole | null;
  liked_by_me?: number;
  reported_by_me?: number;
}

interface PoliticianRow {
  id: string;
  user_id: string | null;
  name: string;
  party: string;
  role_title: string;
  region: string;
  avatar_url: string | null;
  online: number;
  status: string | null;
  tags: string | null;
}

interface ChatRow {
  id: string;
  user_id: string;
  politician_id: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
}

interface MessageRow {
  id: string;
  room_id: string;
  sender_id: string;
  body: string;
  read: number;
  created_at: string;
}

function now() {
  return new Date().toISOString();
}

function jsonString(value: unknown) {
  return JSON.stringify(value ?? []);
}

function parseJsonArray(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function bool(value: boolean | number | null | undefined) {
  return value ? 1 : 0;
}

function normalizePhone(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function codeHash(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function assertUserRole(user: UserProfile | null | undefined, role: UserRole) {
  if (user?.role !== role) {
    throw new Error("권한이 없습니다.");
  }
}

function prepare(sql: string) {
  return getDb().prepare(sql);
}

function all<T>(sql: string, params: SQLiteParams = {}) {
  return prepare(sql).all(params) as T[];
}

function get<T>(sql: string, params: SQLiteParams = {}) {
  return prepare(sql).get(params) as T | undefined;
}

function run(sql: string, params: SQLiteParams = {}) {
  return prepare(sql).run(params);
}

function transaction<T>(work: () => T) {
  getDb().exec("begin immediate");
  try {
    const result = work();
    getDb().exec("commit");
    return result;
  } catch (error) {
    getDb().exec("rollback");
    throw error;
  }
}

function ensureColumn(database: DatabaseSync, table: string, column: string, definition: string) {
  const columns = database.prepare(`pragma table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((item) => item.name === column)) {
    database.exec(`alter table ${table} add column ${column} ${definition}`);
  }
}

function createSchema(database: DatabaseSync) {
  database.exec(`
    pragma foreign_keys = on;
    pragma journal_mode = wal;

    create table if not exists users (
      id text primary key,
      phone text not null unique,
      password_hash text not null,
      role text not null default 'user',
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now'))
    );

    create table if not exists profiles (
      id text primary key references users(id) on delete cascade,
      name text not null,
      nickname text not null unique,
      gender text not null default 'other',
      age_group text not null,
      region text not null,
      income_level text not null,
      avatar_url text,
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now'))
    );

    create table if not exists sessions (
      token_hash text primary key,
      user_id text not null references users(id) on delete cascade,
      expires_at text not null,
      created_at text not null default (datetime('now'))
    );

    create table if not exists phone_verifications (
      id text primary key,
      phone text not null,
      purpose text not null default 'signup',
      code_hash text not null,
      expires_at text not null,
      attempts integer not null default 0,
      verified_at text,
      consumed_at text,
      user_id text references users(id) on delete set null,
      created_at text not null default (datetime('now'))
    );

    create table if not exists politicians (
      id text primary key,
      user_id text references users(id) on delete set null,
      name text not null,
      party text not null,
      role_title text not null,
      region text not null,
      avatar_url text,
      status text,
      online integer not null default 0,
      tags text not null default '[]',
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now'))
    );

    create table if not exists issues (
      id text primary key,
      slug text not null unique,
      title text not null,
      summary text not null,
      description text not null,
      hot integer not null default 0,
      published integer not null default 1,
      views integer not null default 0,
      participants integer not null default 0,
      comments_count integer not null default 0,
      reaction_count integer not null default 0,
      created_by text references users(id) on delete set null,
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now'))
    );

    create table if not exists issue_options (
      id text primary key,
      issue_id text not null references issues(id) on delete cascade,
      title text not null,
      short_text text not null,
      gradient text default 'linear-gradient(135deg,#244868,#345f8f,#e04b5d)',
      party_alignment text,
      difference text,
      pros text not null default '[]',
      cons text not null default '[]',
      votes_count integer not null default 0,
      percent integer not null default 0,
      sort_order integer not null default 0,
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now'))
    );

    create table if not exists issue_option_politicians (
      issue_option_id text not null references issue_options(id) on delete cascade,
      politician_id text not null references politicians(id) on delete cascade,
      primary key (issue_option_id, politician_id)
    );

    create table if not exists issue_votes (
      issue_id text not null references issues(id) on delete cascade,
      user_id text not null references users(id) on delete cascade,
      issue_option_id text not null references issue_options(id) on delete cascade,
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now')),
      primary key (issue_id, user_id)
    );

    create table if not exists issue_vote_cancellations (
      issue_id text not null references issues(id) on delete cascade,
      user_id text not null references users(id) on delete cascade,
      issue_option_id text,
      canceled_at text not null default (datetime('now')),
      primary key (issue_id, user_id)
    );

    create table if not exists issue_views (
      id text primary key,
      issue_id text not null references issues(id) on delete cascade,
      user_id text references users(id) on delete set null,
      created_at text not null default (datetime('now'))
    );

    create table if not exists news_links (
      id text primary key,
      issue_id text not null references issues(id) on delete cascade,
      title text not null,
      outlet text not null,
      url text not null,
      created_at text not null default (datetime('now')),
      unique (issue_id, url)
    );

    create table if not exists comments (
      id text primary key,
      issue_id text not null references issues(id) on delete cascade,
      parent_id text references comments(id) on delete cascade,
      user_id text not null references users(id) on delete cascade,
      body text not null,
      likes_count integer not null default 0,
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now'))
    );

    create table if not exists comment_likes (
      comment_id text not null references comments(id) on delete cascade,
      user_id text not null references users(id) on delete cascade,
      created_at text not null default (datetime('now')),
      primary key (comment_id, user_id)
    );

    create table if not exists reports (
      id text primary key,
      comment_id text references comments(id) on delete cascade,
      reporter_id text not null references users(id) on delete cascade,
      reason text,
      status text not null default 'pending',
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now')),
      unique (comment_id, reporter_id)
    );

    create table if not exists chats (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      politician_id text not null references politicians(id) on delete cascade,
      last_message text,
      last_message_at text,
      unread_count integer not null default 0,
      created_at text not null default (datetime('now')),
      updated_at text not null default (datetime('now')),
      unique (user_id, politician_id)
    );

    create table if not exists chat_messages (
      id text primary key,
      room_id text not null references chats(id) on delete cascade,
      sender_id text not null references users(id) on delete cascade,
      body text not null,
      read integer not null default 0,
      created_at text not null default (datetime('now'))
    );

    create index if not exists issue_options_issue_idx on issue_options(issue_id, sort_order);
    create index if not exists comments_issue_idx on comments(issue_id, created_at);
    create index if not exists chat_messages_room_idx on chat_messages(room_id, created_at);
  `);
  ensureColumn(database, "issue_vote_cancellations", "issue_option_id", "text");
}

function upsertUser(input: {
  id: string;
  phone: string;
  password: string;
  role: UserRole;
  name: string;
  nickname: string;
  gender: Gender;
  ageGroup: AgeGroup;
  region: string;
  incomeLevel: IncomeLevel;
  avatarUrl?: string | null;
}) {
  run(
    `insert into users (id, phone, password_hash, role, created_at, updated_at)
     values ($id, $phone, $passwordHash, $role, $now, $now)
     on conflict(id) do update set phone = excluded.phone, role = excluded.role, updated_at = excluded.updated_at`,
    {
      $id: input.id,
      $phone: normalizePhone(input.phone),
      $passwordHash: hashPassword(input.password),
      $role: input.role,
      $now: now()
    }
  );

  run(
    `insert into profiles (id, name, nickname, gender, age_group, region, income_level, avatar_url, created_at, updated_at)
     values ($id, $name, $nickname, $gender, $ageGroup, $region, $incomeLevel, $avatarUrl, $now, $now)
     on conflict(id) do update set
      name = excluded.name,
      nickname = excluded.nickname,
      gender = excluded.gender,
      age_group = excluded.age_group,
      region = excluded.region,
      income_level = excluded.income_level,
      avatar_url = excluded.avatar_url,
      updated_at = excluded.updated_at`,
    {
      $id: input.id,
      $name: input.name,
      $nickname: input.nickname,
      $gender: input.gender,
      $ageGroup: input.ageGroup,
      $region: input.region,
      $incomeLevel: input.incomeLevel,
      $avatarUrl: input.avatarUrl ?? null,
      $now: now()
    }
  );
}

const politicianSeed = [
  ["00000000-0000-0000-0000-000000000101", "박서연", "민주미래당", "국회의원", "서울", "/avatars/politician-1.svg", 1, "청년 주거와 AI 정책 질의 응답 중", ["청년", "주거", "디지털"]],
  ["00000000-0000-0000-0000-000000000102", "김도윤", "국민개혁당", "정책위 부의장", "부산", "/avatars/politician-2.svg", 1, "개헌 토론방 실시간 참여", ["개헌", "권력구조", "균형발전"]],
  ["00000000-0000-0000-0000-000000000103", "이하린", "녹색전환당", "지역위원장", "광주", "/avatars/politician-3.svg", 0, "오늘 오후 8시 답변 예정", ["의료", "기후", "지역"]],
  ["00000000-0000-0000-0000-000000000104", "최민준", "무소속", "시장", "대전", "/avatars/politician-4.svg", 1, "지역 균형 발전 의견 수렴 중", ["행정", "교통", "예산"]]
] as const;

const issueSeed = [
  {
    id: "10000000-0000-0000-0000-000000000001",
    slug: "presidential-term-reform",
    title: "대통령의 연임 개헌에 대한 나의 생각은?",
    summary: "대통령 4년 연임제 도입과 권력구조 개편을 함께 논의해야 할까요?",
    description: "현행 5년 단임제와 4년 연임제, 분권형 개헌의 장단점을 비교합니다.",
    hot: true,
    news: ["권력구조 개편 논의 다시 수면 위로", "VoteIt 브리핑", "https://example.com/news/term-reform"],
    options: [
      ["20000000-0000-0000-0000-000000000101", "정책 연속성 강화 필요", "정책의 연속성이 높아지고 대통령이 국민 평가를 의식해 더 책임 있게 국정을 운영할 것이다.", "linear-gradient(135deg,#244868,#345f8f,#e04b5d)", "국민개혁당 개헌특위와 가까운 입장", "연임제 찬성은 정책 성과에 대한 중간 평가를 제도화한다는 점에서 현행 유지와 다릅니다.", ["장기 국정과제의 추진력이 높아질 수 있어요.", "성과가 낮은 정부를 선거로 교체할 명분도 명확해져요."], ["현직 대통령 프리미엄이 커질 수 있어요.", "선거 전략이 국정 운영을 좌우할 수 있어요."], "00000000-0000-0000-0000-000000000102"],
      ["20000000-0000-0000-0000-000000000102", "권력 집중 위험", "대통령에게 권력이 지나치게 집중되어 장기 집권과 권력 남용 위험이 커질 것이다.", "linear-gradient(135deg,#e4233f,#c83e54,#244868)", "민주미래당 견제론 그룹과 가까운 입장", "권력 집중 우려는 임기보다 견제 장치의 부재를 핵심 문제로 봅니다.", ["권력 남용 가능성을 먼저 점검합니다.", "국회와 사법부 견제 장치를 함께 논의하게 합니다."], ["정책 연속성 문제를 해결하지 못할 수 있어요.", "모든 개헌 논의를 위험 프레임으로만 볼 수 있어요."], "00000000-0000-0000-0000-000000000101"],
      ["20000000-0000-0000-0000-000000000103", "분권형 개헌 병행 필요", "대통령 권한 분산과 국회·지방정부의 견제 강화 같은 분권형 개헌과 함께 추진되어야 한다.", "linear-gradient(135deg,#244868,#2b6f82,#d94b5e)", "지방분권 연대와 가까운 입장", "연임 여부보다 권한 배분 설계를 먼저 보자는 절충형 관점입니다.", ["찬반 양쪽의 우려를 제도 설계로 흡수할 수 있어요.", "지방정부와 국회의 책임성을 함께 키울 수 있어요."], ["논의 범위가 넓어져 합의 속도가 느릴 수 있어요.", "세부 설계가 불명확하면 메시지가 흐려질 수 있어요."], "00000000-0000-0000-0000-000000000104"],
      ["20000000-0000-0000-0000-000000000104", "현행 유지", "단임제의 장점을 유지하고 권력 견제와 정책 지속성은 법률과 국정 운영 방식으로 보완해야 한다.", "linear-gradient(135deg,#4a5568,#2d3748,#23445f)", "제도 안정성을 강조하는 중도 그룹과 가까운 입장", "개헌보다 현재 제도 안에서 운영 방식을 개선하는 데 무게를 둡니다.", ["큰 제도 변경의 사회적 비용을 줄일 수 있어요.", "권력 집중 우려를 구조적으로 피할 수 있어요."], ["정책 단절 문제는 계속 남을 수 있어요.", "현행 제도에 대한 시민 피로감을 해소하기 어려워요."], "00000000-0000-0000-0000-000000000103"]
    ]
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    slug: "medical-school-quota",
    title: "의대 정원 확대, 어디까지 필요할까?",
    summary: "지역 의료 공백 해소와 의료 교육의 질 사이에서 적정 확대 폭을 비교합니다.",
    description: "의대 정원 확대와 필수 의료 개선 정책의 선택지를 비교합니다.",
    hot: true,
    news: ["지역 필수의료 인력 공백 진단", "정책노트", "https://example.com/news/medical"],
    options: [
      ["20000000-0000-0000-0000-000000000201", "단계적 확대", "교육 인프라와 병행해 매년 점진적으로 늘려야 한다.", "linear-gradient(135deg,#244868,#4472a6,#e15a6a)", "중도 보건의료 개혁안과 가까운 입장", "속도보다 지속 가능성을 중시합니다.", ["교육 질 저하를 줄여요.", "의료계와 합의 여지가 커요."], ["효과가 늦게 나타날 수 있어요.", "지역 공백이 당장 해소되기 어려워요."], "00000000-0000-0000-0000-000000000103"],
      ["20000000-0000-0000-0000-000000000202", "대규모 확대", "부족 규모를 감안해 빠르고 크게 늘려야 한다.", "linear-gradient(135deg,#e4233f,#d45564,#244868)", "강한 공급 확대론과 가까운 입장", "의사 수 부족을 핵심 원인으로 봅니다.", ["지역과 필수의료 공급을 빠르게 늘릴 수 있어요.", "경쟁 완화 효과를 기대할 수 있어요."], ["수련 병원과 교수 확보가 부담이에요.", "단기 갈등 비용이 커질 수 있어요."], "00000000-0000-0000-0000-000000000102"],
      ["20000000-0000-0000-0000-000000000203", "지역의사제 병행", "정원 확대와 함께 지역 근무 의무와 지원책이 필요하다.", "linear-gradient(135deg,#25636f,#2f7f8d,#e05263)", "지역균형 의료 그룹과 가까운 입장", "단순 증원보다 배치 구조를 함께 봅니다.", ["실제 지역 공백 해결에 직접적이에요.", "장학금·주거 지원과 묶어 설계할 수 있어요."], ["직업 선택 자유 논쟁이 생길 수 있어요.", "의무 기간 종료 후 이탈 가능성이 있어요."], "00000000-0000-0000-0000-000000000104"],
      ["20000000-0000-0000-0000-000000000204", "현행 유지", "정원보다 근무 환경과 수가 개선이 먼저다.", "linear-gradient(135deg,#4a5568,#2d3748,#244868)", "의료체계 개선 우선론과 가까운 입장", "인력 총량보다 필수의료 유인을 우선합니다.", ["필수의료 현장의 원인을 정밀하게 봐요.", "교육 질을 안정적으로 유지할 수 있어요."], ["인력 부족 체감은 계속될 수 있어요.", "증원 요구에 답이 부족해 보일 수 있어요."], "00000000-0000-0000-0000-000000000101"]
    ]
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    slug: "youth-housing",
    title: "청년 주거 정책, 현금 지원 vs 공급 확대?",
    summary: "월세 부담 완화와 도심 공급 확대의 우선순위를 묻습니다.",
    description: "청년 주거 불안 해소 정책을 비교합니다.",
    hot: true,
    news: ["청년 1인 가구 주거비 부담 분석", "도시정책랩", "https://example.com/news/housing"],
    options: [
      ["20000000-0000-0000-0000-000000000301", "월세 직접 지원", "당장 체감되는 주거비를 낮추기 위해 현금성 지원을 확대한다.", "linear-gradient(135deg,#e4233f,#d05261,#244868)", "청년 생활비 지원론과 가까운 입장", "즉각적인 부담 완화에 초점을 둡니다.", ["정책 체감이 빠릅니다.", "저소득 청년에게 직접 도움이 됩니다."], ["임대료 상승으로 전가될 수 있습니다.", "재정 지속성이 쟁점입니다."], "00000000-0000-0000-0000-000000000101"],
      ["20000000-0000-0000-0000-000000000302", "도심 공급 확대", "교통 좋은 지역의 공공임대와 소형 주택 공급을 늘린다.", "linear-gradient(135deg,#244868,#366999,#e75a68)", "도시 공급 확대론과 가까운 입장", "가격의 구조적 원인을 공급 부족으로 봅니다.", ["장기 가격 안정에 도움이 됩니다.", "직주근접 문제를 함께 다룹니다."], ["사업 기간이 길고 갈등이 큽니다.", "입지 선정이 어려울 수 있습니다."], "00000000-0000-0000-0000-000000000104"],
      ["20000000-0000-0000-0000-000000000303", "보증금 금융 지원", "저리 대출과 보증보험으로 초기 비용 장벽을 낮춘다.", "linear-gradient(135deg,#255b76,#2c817a,#d95565)", "금융 접근성 개선론과 가까운 입장", "목돈 부족 문제를 해결하려는 접근입니다.", ["초기 진입 장벽을 낮춥니다.", "예산 대비 지원 범위를 넓힐 수 있습니다."], ["부채 부담이 남습니다.", "소득이 낮으면 체감이 제한적입니다."], "00000000-0000-0000-0000-000000000102"],
      ["20000000-0000-0000-0000-000000000304", "규제 완화", "민간 임대 공급을 늘리도록 세제와 용도 규제를 완화한다.", "linear-gradient(135deg,#4a5568,#35516d,#244868)", "민간 공급 촉진론과 가까운 입장", "민간 참여를 통해 공급 속도를 높이자는 관점입니다.", ["민간 자본을 활용할 수 있습니다.", "행정 부담이 줄 수 있습니다."], ["공공성 확보가 어렵습니다.", "취약계층 보호 장치가 필요합니다."], "00000000-0000-0000-0000-000000000103"]
    ]
  },
  {
    id: "10000000-0000-0000-0000-000000000004",
    slug: "ai-regulation",
    title: "AI 규제법, 혁신과 안전의 균형은?",
    summary: "고위험 AI 규제, 투명성 의무, 산업 경쟁력 사이의 기준을 비교합니다.",
    description: "AI 규제법의 강도와 적용 범위를 비교합니다.",
    hot: false,
    news: ["고위험 AI 기준과 기업 부담", "테크정책", "https://example.com/news/ai-law"],
    options: [
      ["20000000-0000-0000-0000-000000000401", "강한 사전 규제", "고위험 AI는 출시 전 안전성 심사를 의무화한다.", "linear-gradient(135deg,#e4233f,#c64c5d,#244868)", "안전 우선 규제론과 가까운 입장", "피해 예방을 혁신 속도보다 우선합니다.", ["사회적 위험을 선제적으로 줄입니다.", "책임 소재가 명확해집니다."], ["스타트업 진입 장벽이 높아질 수 있습니다.", "심사 기준이 느리면 혁신을 막을 수 있습니다."], "00000000-0000-0000-0000-000000000103"],
      ["20000000-0000-0000-0000-000000000402", "위험 기반 규제", "위험 등급별로 의무를 달리하고 저위험 서비스는 완화한다.", "linear-gradient(135deg,#244868,#346f91,#e15464)", "디지털 균형론과 가까운 입장", "모든 AI를 같은 강도로 보지 않는 절충안입니다.", ["안전과 혁신을 구분해 설계합니다.", "현장 적용 가능성이 높습니다."], ["위험 등급 판정이 논쟁적입니다.", "감독 역량이 필요합니다."], "00000000-0000-0000-0000-000000000101"],
      ["20000000-0000-0000-0000-000000000403", "투명성 의무 중심", "AI 생성 표시, 학습 데이터 설명, 이의제기권을 우선 도입한다.", "linear-gradient(135deg,#27516e,#2e7b7c,#db5364)", "이용자 권리 강화론과 가까운 입장", "통제보다 설명과 선택권을 중시합니다.", ["이용자의 판단권을 키웁니다.", "기업 부담이 상대적으로 낮습니다."], ["위험 자체를 막기엔 부족할 수 있습니다.", "표시 의무가 형식화될 수 있습니다."], "00000000-0000-0000-0000-000000000102"],
      ["20000000-0000-0000-0000-000000000404", "자율 규제", "산업 성장을 위해 민간 가이드라인과 사후 책임을 중심으로 한다.", "linear-gradient(135deg,#4a5568,#314b65,#244868)", "산업 경쟁력 우선론과 가까운 입장", "빠른 기술 변화에 민간이 더 잘 대응한다는 관점입니다.", ["서비스 출시와 실험이 빨라집니다.", "글로벌 경쟁에 유리할 수 있습니다."], ["피해 발생 후 대응이 늦을 수 있습니다.", "약한 기업은 기준을 지키기 어렵습니다."], "00000000-0000-0000-0000-000000000104"]
    ]
  },
  {
    id: "10000000-0000-0000-0000-000000000005",
    slug: "regional-balance",
    title: "지역 균형 발전, 예산을 어디에 집중할까?",
    summary: "수도권 집중 완화와 지역 성장 거점 전략의 우선순위를 비교합니다.",
    description: "지역 균형 발전 예산 배분 방향을 비교합니다.",
    hot: false,
    news: ["지역 성장 거점 정책의 성과와 한계", "균형발전리포트", "https://example.com/news/region"],
    options: [
      ["20000000-0000-0000-0000-000000000501", "공공기관 2차 이전", "중앙 공공기관과 연구기관을 추가 이전해 지역 일자리를 만든다.", "linear-gradient(135deg,#244868,#386a98,#e65b69)", "분권 강화론과 가까운 입장", "공공 부문이 먼저 지역 수요를 만든다는 관점입니다.", ["지역 고용을 빠르게 만들 수 있습니다.", "상징성이 큽니다."], ["기관만 옮기면 가족·기업 이전은 제한적일 수 있습니다.", "수도권 반발이 생길 수 있습니다."], "00000000-0000-0000-0000-000000000104"],
      ["20000000-0000-0000-0000-000000000502", "광역 교통망 투자", "생활권을 넓히는 철도와 도로망에 우선 투자한다.", "linear-gradient(135deg,#255674,#2f7f8d,#df5465)", "생활권 연결론과 가까운 입장", "이동 시간을 줄여 지역 선택지를 늘립니다.", ["출퇴근·통학 가능 범위를 넓힙니다.", "기업 입지 매력을 높일 수 있습니다."], ["대규모 예산과 긴 시간이 필요합니다.", "수요 예측 실패 위험이 있습니다."], "00000000-0000-0000-0000-000000000102"],
      ["20000000-0000-0000-0000-000000000503", "지역 대학 혁신", "지역 대학, 병원, 기업을 묶은 인재 생태계를 만든다.", "linear-gradient(135deg,#e4233f,#c94d5f,#244868)", "교육·산업 클러스터론과 가까운 입장", "인재가 남을 이유를 만드는 데 초점을 둡니다.", ["청년 유출을 구조적으로 줄입니다.", "산업 전환과 연결하기 좋습니다."], ["성과가 느리게 나타납니다.", "대학 간 격차가 커질 수 있습니다."], "00000000-0000-0000-0000-000000000101"],
      ["20000000-0000-0000-0000-000000000504", "기업 세제 혜택", "지역 이전 기업에 세제·규제 특례를 강하게 제공한다.", "linear-gradient(135deg,#4a5568,#31506a,#244868)", "민간 투자 유치론과 가까운 입장", "민간 일자리를 직접 끌어오려는 접근입니다.", ["기업 유치 효과가 빠를 수 있습니다.", "지역 세수 기반을 만들 수 있습니다."], ["혜택 종료 후 이탈 가능성이 있습니다.", "지역 간 유치 경쟁이 과열될 수 있습니다."], "00000000-0000-0000-0000-000000000103"]
    ]
  }
] as const;

function seedDatabase() {
  const seeded = get<{ value: string }>("select value from app_meta where key = 'seed_version'");
  if (seeded?.value === "sqlite-v1") return;

  transaction(() => {
    upsertUser({
      id: "30000000-0000-0000-0000-000000000001",
      phone: "010-1234-5678",
      password: "voteit1234!",
      role: "user",
      name: "테스트사용자",
      nickname: "테스트시민",
      gender: "other",
      ageGroup: "30대",
      region: "서울",
      incomeLevel: "200-400만원"
    });

    upsertUser({
      id: "30000000-0000-0000-0000-000000000002",
      phone: "010-0000-0000",
      password: "admin1234!",
      role: "admin",
      name: "관리자",
      nickname: "보팃관리자",
      gender: "other",
      ageGroup: "30대",
      region: "서울",
      incomeLevel: "400-700만원"
    });

    for (const politician of politicianSeed) {
      run(
        `insert into politicians (id, name, party, role_title, region, avatar_url, online, status, tags, updated_at)
         values ($id, $name, $party, $role, $region, $avatar, $online, $status, $tags, $now)
         on conflict(id) do update set name = excluded.name, party = excluded.party, role_title = excluded.role_title,
          region = excluded.region, avatar_url = excluded.avatar_url, online = excluded.online, status = excluded.status,
          tags = excluded.tags, updated_at = excluded.updated_at`,
        {
          $id: politician[0],
          $name: politician[1],
          $party: politician[2],
          $role: politician[3],
          $region: politician[4],
          $avatar: politician[5],
          $online: politician[6],
          $status: politician[7],
          $tags: jsonString(politician[8]),
          $now: now()
        }
      );
    }

    for (const issue of issueSeed) {
      run(
        `insert into issues (id, slug, title, summary, description, hot, published, updated_at)
         values ($id, $slug, $title, $summary, $description, $hot, 1, $now)
         on conflict(id) do update set slug = excluded.slug, title = excluded.title, summary = excluded.summary,
          description = excluded.description, hot = excluded.hot, published = excluded.published, updated_at = excluded.updated_at`,
        {
          $id: issue.id,
          $slug: issue.slug,
          $title: issue.title,
          $summary: issue.summary,
          $description: issue.description,
          $hot: bool(issue.hot),
          $now: now()
        }
      );

      run(
        `insert into news_links (id, issue_id, title, outlet, url)
         values ($id, $issueId, $title, $outlet, $url)
         on conflict(issue_id, url) do update set title = excluded.title, outlet = excluded.outlet`,
        {
          $id: randomUUID(),
          $issueId: issue.id,
          $title: issue.news[0],
          $outlet: issue.news[1],
          $url: issue.news[2]
        }
      );

      issue.options.forEach((option, index) => {
        run(
          `insert into issue_options (id, issue_id, title, short_text, gradient, party_alignment, difference, pros, cons, sort_order, updated_at)
           values ($id, $issueId, $title, $shortText, $gradient, $partyAlignment, $difference, $pros, $cons, $sortOrder, $now)
           on conflict(id) do update set title = excluded.title, short_text = excluded.short_text, gradient = excluded.gradient,
            party_alignment = excluded.party_alignment, difference = excluded.difference, pros = excluded.pros,
            cons = excluded.cons, sort_order = excluded.sort_order, updated_at = excluded.updated_at`,
          {
            $id: option[0],
            $issueId: issue.id,
            $title: option[1],
            $shortText: option[2],
            $gradient: option[3],
            $partyAlignment: option[4],
            $difference: option[5],
            $pros: jsonString(option[6]),
            $cons: jsonString(option[7]),
            $sortOrder: index + 1,
            $now: now()
          }
        );

        run(
          `insert or ignore into issue_option_politicians (issue_option_id, politician_id) values ($optionId, $politicianId)`,
          { $optionId: option[0], $politicianId: option[8] }
        );
      });
    }

    const voteUser = "30000000-0000-0000-0000-000000000001";
    for (const issue of issueSeed) {
      run(
        `insert or ignore into issue_votes (issue_id, user_id, issue_option_id, created_at, updated_at)
         values ($issueId, $userId, $optionId, $now, $now)`,
        { $issueId: issue.id, $userId: voteUser, $optionId: issue.options[0][0], $now: now() }
      );
      syncIssueCounters(issue.id);
    }

    const commentId = "40000000-0000-0000-0000-000000000001";
    run(
      `insert or ignore into comments (id, issue_id, user_id, body, likes_count, created_at, updated_at)
       values ($id, $issueId, $userId, $body, 0, $now, $now)`,
      {
        $id: commentId,
        $issueId: "10000000-0000-0000-0000-000000000001",
        $userId: voteUser,
        $body: "찬반만 누르는 것보다 왜 그렇게 생각하는지 비교되는 점이 좋아요.",
        $now: now()
      }
    );
    syncIssueCounters("10000000-0000-0000-0000-000000000001");

    run(
      `insert into app_meta (key, value) values ('seed_version', 'sqlite-v1')
       on conflict(key) do update set value = excluded.value`
    );
  });
}

export function getDb() {
  if (db) return db;
  mkdirSync(dirname(dbPath), { recursive: true });
  const firstRun = !existsSync(dbPath);
  db = new DatabaseSync(dbPath);
  db.exec("create table if not exists app_meta (key text primary key, value text not null)");
  createSchema(db);
  if (firstRun || !get<{ value: string }>("select value from app_meta where key = 'seed_version'")) {
    seedDatabase();
  }
  return db;
}

function mapUser(user: UserRow, profile: ProfileRow): UserProfile {
  return {
    id: user.id,
    name: profile.name,
    nickname: profile.nickname,
    phone: user.phone,
    role: user.role,
    gender: profile.gender,
    ageGroup: profile.age_group,
    region: profile.region,
    incomeLevel: profile.income_level,
    avatarUrl: profile.avatar_url ?? undefined,
    createdAt: user.created_at
  };
}

export function getUserProfile(userId: string) {
  const user = get<UserRow>("select id, phone, password_hash, role, created_at from users where id = $id", { $id: userId });
  const profile = get<ProfileRow>(
    "select id, name, nickname, gender, age_group, region, income_level, avatar_url from profiles where id = $id",
    { $id: userId }
  );
  return user && profile ? mapUser(user, profile) : null;
}

export function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  run("insert into sessions (token_hash, user_id, expires_at, created_at) values ($tokenHash, $userId, $expiresAt, $now)", {
    $tokenHash: hashToken(token),
    $userId: userId,
    $expiresAt: daysFromNow(SESSION_DAYS),
    $now: now()
  });
  return { token, expiresAt: daysFromNow(SESSION_DAYS) };
}

export function getUserBySessionToken(token?: string) {
  if (!token) return null;
  const session = get<{ user_id: string; expires_at: string }>(
    "select user_id, expires_at from sessions where token_hash = $tokenHash",
    { $tokenHash: hashToken(token) }
  );
  if (!session || new Date(session.expires_at).getTime() < Date.now()) return null;
  return getUserProfile(session.user_id);
}

export function deleteSession(token?: string) {
  if (!token) return;
  run("delete from sessions where token_hash = $tokenHash", { $tokenHash: hashToken(token) });
}

export function loginWithPassword(phone: string, password: string) {
  const normalizedPhone = normalizePhone(phone);
  const user = get<UserRow>("select id, phone, password_hash, role, created_at from users where phone = $phone", {
    $phone: normalizedPhone
  });
  if (!user || !verifyPassword(password, user.password_hash)) {
    throw new Error("휴대폰 번호 또는 비밀번호가 올바르지 않습니다.");
  }
  const profile = getUserProfile(user.id);
  if (!profile) throw new Error("사용자 프로필을 찾을 수 없습니다.");
  return profile;
}

export function requestOtp(phone: string, purpose = "signup") {
  const normalizedPhone = normalizePhone(phone);
  if (!/^01\d{8,9}$/.test(normalizedPhone)) {
    throw new Error("올바른 휴대폰 번호를 입력해 주세요.");
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const id = randomUUID();
  run(
    `insert into phone_verifications (id, phone, purpose, code_hash, expires_at, created_at)
     values ($id, $phone, $purpose, $codeHash, $expiresAt, $now)`,
    { $id: id, $phone: normalizedPhone, $purpose: purpose, $codeHash: codeHash(code), $expiresAt: expiresAt, $now: now() }
  );
  return { verificationId: id, expiresAt, code };
}

export function verifyOtp(verificationId: string, code: string) {
  const verification = get<{
    id: string;
    code_hash: string;
    expires_at: string;
    attempts: number;
    verified_at: string | null;
    consumed_at: string | null;
  }>("select id, code_hash, expires_at, attempts, verified_at, consumed_at from phone_verifications where id = $id", {
    $id: verificationId
  });
  if (!verification) throw new Error("인증 정보를 찾을 수 없습니다.");
  if (verification.consumed_at) throw new Error("이미 사용된 인증번호입니다.");
  if (new Date(verification.expires_at).getTime() < Date.now()) throw new Error("인증번호가 만료되었습니다.");
  if (verification.attempts >= 5) throw new Error("인증 시도 횟수를 초과했습니다. 다시 요청해 주세요.");

  if (verification.code_hash !== codeHash(code)) {
    run("update phone_verifications set attempts = attempts + 1 where id = $id", { $id: verificationId });
    throw new Error("인증번호가 올바르지 않습니다.");
  }

  run("update phone_verifications set verified_at = $now where id = $id", { $now: now(), $id: verificationId });
  return { verificationId, verified: true as const };
}

export function signUp(input: SignUpInput) {
  const normalizedPhone = normalizePhone(input.phone);
  const verification = get<{ id: string; phone: string; verified_at: string | null; consumed_at: string | null; expires_at: string }>(
    "select id, phone, verified_at, consumed_at, expires_at from phone_verifications where id = $id",
    { $id: input.verificationId }
  );
  if (!verification || verification.phone !== normalizedPhone || !verification.verified_at || verification.consumed_at) {
    throw new Error("휴대폰 인증을 먼저 완료해 주세요.");
  }
  if (new Date(verification.expires_at).getTime() < Date.now()) throw new Error("인증 시간이 만료되었습니다.");
  if (get("select id from users where phone = $phone", { $phone: normalizedPhone })) {
    throw new Error("이미 가입된 휴대폰 번호입니다.");
  }
  if (get("select id from profiles where nickname = $nickname", { $nickname: input.nickname })) {
    throw new Error("이미 사용 중인 닉네임입니다.");
  }

  const id = randomUUID();
  transaction(() => {
    upsertUser({
      id,
      phone: normalizedPhone,
      password: input.password,
      role: "user",
      name: input.name,
      nickname: input.nickname,
      gender: input.gender,
      ageGroup: input.ageGroup,
      region: input.region,
      incomeLevel: input.incomeLevel
    });
    run("update phone_verifications set consumed_at = $now, user_id = $userId where id = $id", {
      $now: now(),
      $userId: id,
      $id: input.verificationId
    });
  });
  return getUserProfile(id)!;
}

function mapPolitician(row: PoliticianRow): Politician {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    party: row.party,
    role: row.role_title,
    region: row.region,
    avatarUrl: row.avatar_url ?? "/avatars/politician-1.svg",
    online: Boolean(row.online),
    status: row.status ?? "",
    tags: parseJsonArray(row.tags) as string[]
  };
}

export function listPoliticians() {
  return all<PoliticianRow>(
    "select id, user_id, name, party, role_title, region, avatar_url, online, status, tags from politicians where user_id is not null order by created_at desc"
  ).map(mapPolitician);
}

function uniqueProfileNickname(baseName: string) {
  const base = baseName.trim() || "정치인";
  if (!get("select id from profiles where nickname = $nickname", { $nickname: base })) return base;
  return `${base}-${randomUUID().slice(0, 6)}`;
}

export function createPoliticianAccount(input: AdminPoliticianInput, user: UserProfile) {
  assertUserRole(user, "admin");
  const normalizedPhone = normalizePhone(input.phone);
  if (!/^01\d{8,9}$/.test(normalizedPhone)) throw new Error("올바른 휴대폰 번호를 입력해 주세요.");
  if (input.password.length < 8) throw new Error("비밀번호는 8자 이상이어야 합니다.");
  if (!input.name.trim() || !input.party.trim() || !input.roleTitle.trim() || !input.region.trim()) {
    throw new Error("정치인 계정 필수 정보를 모두 입력해 주세요.");
  }
  if (get("select id from users where phone = $phone", { $phone: normalizedPhone })) {
    throw new Error("이미 가입된 휴대폰 번호입니다.");
  }

  const userId = randomUUID();
  const politicianId = randomUUID();
  const avatarUrl = input.avatarUrl?.trim() || "/avatars/politician-1.svg";
  transaction(() => {
    upsertUser({
      id: userId,
      phone: normalizedPhone,
      password: input.password,
      role: "politician",
      name: input.name.trim(),
      nickname: uniqueProfileNickname(input.name),
      gender: "other",
      ageGroup: "40대",
      region: input.region.trim(),
      incomeLevel: "밝히고 싶지 않음",
      avatarUrl
    });
    run(
      `insert into politicians (id, user_id, name, party, role_title, region, avatar_url, online, status, tags, created_at, updated_at)
       values ($id, $userId, $name, $party, $roleTitle, $region, $avatarUrl, 0, '', $tags, $now, $now)`,
      {
        $id: politicianId,
        $userId: userId,
        $name: input.name.trim(),
        $party: input.party.trim(),
        $roleTitle: input.roleTitle.trim(),
        $region: input.region.trim(),
        $avatarUrl: avatarUrl,
        $tags: JSON.stringify(input.tags?.map((tag) => tag.trim()).filter(Boolean) ?? []),
        $now: now()
      }
    );
  });

  return listPoliticians().find((politician) => politician.id === politicianId)!;
}

export function updateProfileAvatar(userId: string, avatarUrl: string) {
  transaction(() => {
    run("update profiles set avatar_url = $avatarUrl, updated_at = $now where id = $userId", {
      $avatarUrl: avatarUrl,
      $now: now(),
      $userId: userId
    });
    run("update politicians set avatar_url = $avatarUrl, updated_at = $now where user_id = $userId", {
      $avatarUrl: avatarUrl,
      $now: now(),
      $userId: userId
    });
  });
  const profile = getUserProfile(userId);
  if (!profile) throw new Error("사용자 프로필을 찾을 수 없습니다.");
  return profile;
}

export function updatePoliticianAvatar(politicianId: string, avatarUrl: string, user: UserProfile) {
  assertUserRole(user, "admin");
  const politician = get<PoliticianRow>(
    "select id, user_id, name, party, role_title, region, avatar_url, online, status, tags from politicians where id = $id and user_id is not null",
    { $id: politicianId }
  );
  if (!politician) throw new Error("정치인 계정을 찾을 수 없습니다.");
  transaction(() => {
    run("update politicians set avatar_url = $avatarUrl, updated_at = $now where id = $id", {
      $avatarUrl: avatarUrl,
      $now: now(),
      $id: politicianId
    });
    if (politician.user_id) {
      run("update profiles set avatar_url = $avatarUrl, updated_at = $now where id = $userId", {
        $avatarUrl: avatarUrl,
        $now: now(),
        $userId: politician.user_id
      });
    }
  });
  return listPoliticians().find((item) => item.id === politicianId)!;
}

function mapOption(row: OptionRow, politicianIds: string[] = []): IssueOption {
  return {
    id: row.id,
    issueId: row.issue_id,
    title: row.title,
    shortText: row.short_text,
    gradient: row.gradient ?? "linear-gradient(135deg,#244868,#345f8f,#e04b5d)",
    partyAlignment: row.party_alignment ?? "연결된 정치 성향 정보가 없습니다.",
    politicianIds,
    difference: row.difference ?? "",
    pros: parseJsonArray(row.pros) as string[],
    cons: parseJsonArray(row.cons) as string[],
    percent: row.percent,
    votesCount: row.votes_count,
    sortOrder: row.sort_order
  };
}

function issueStatistics(issueId: string): Record<string, IssueStatistics> {
  const options = all<{ id: string }>("select id from issue_options where issue_id = $issueId", { $issueId: issueId });
  const statFor = (optionId: string, column: "age_group" | "gender" | "region" | "income_level"): BreakdownPoint[] => {
    const rows = all<{ label: string; value: number }>(
      `select p.${column} as label, count(*) as value
       from issue_votes v
       join profiles p on p.id = v.user_id
       where v.issue_option_id = $optionId
       group by p.${column}
       order by value desc`,
      { $optionId: optionId }
    );
    const total = rows.reduce((sum, row) => sum + Number(row.value), 0);
    return rows.map((row) => ({ label: row.label, value: total ? Math.round((Number(row.value) / total) * 100) : 0 }));
  };

  return Object.fromEntries(
    options.map((option) => [
      option.id,
      {
        age: statFor(option.id, "age_group"),
        gender: statFor(option.id, "gender"),
        region: statFor(option.id, "region"),
        income: statFor(option.id, "income_level")
      }
    ])
  );
}

function mapIssue(row: IssueRow, withStatistics = false): Issue {
  const options = all<OptionRow>("select * from issue_options where issue_id = $issueId order by sort_order asc", {
    $issueId: row.id
  }).map((option) => {
    const politicianIds = all<{ politician_id: string }>(
      "select politician_id from issue_option_politicians where issue_option_id = $optionId",
      { $optionId: option.id }
    ).map((item) => item.politician_id);
    return mapOption(option, politicianIds);
  });

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    hot: Boolean(row.hot),
    published: Boolean(row.published),
    views: row.views,
    participants: row.participants,
    commentsCount: row.comments_count,
    reactionCount: row.reaction_count,
    newsLinks: all<NewsRow>("select id, title, outlet, url from news_links where issue_id = $issueId order by created_at asc", {
      $issueId: row.id
    }) as NewsLink[],
    options,
    statistics: withStatistics ? issueStatistics(row.id) : {}
  };
}

export function listIssues({ includeUnpublished = false } = {}) {
  const rows = all<IssueRow>(
    `select * from issues ${includeUnpublished ? "" : "where published = 1"} order by hot desc, created_at desc`
  );
  return rows.map((row) => mapIssue(row));
}

export function getIssueBySlug(slug: string) {
  const row = get<IssueRow>("select * from issues where slug = $slug and published = 1", { $slug: slug });
  if (!row) throw new Error("현안을 찾을 수 없습니다.");
  return mapIssue(row, true);
}

export function recordIssueView(issueId: string, userId?: string | null) {
  if (userId) {
    const existing = get<{ id: string }>("select id from issue_views where issue_id = $issueId and user_id = $userId limit 1", {
      $issueId: issueId,
      $userId: userId
    });
    if (!existing) run("insert into issue_views (id, issue_id, user_id, created_at) values ($id, $issueId, $userId, $now)", {
      $id: randomUUID(),
      $issueId: issueId,
      $userId: userId,
      $now: now()
    });
  } else {
    run("insert into issue_views (id, issue_id, user_id, created_at) values ($id, $issueId, null, $now)", {
      $id: randomUUID(),
      $issueId: issueId,
      $now: now()
    });
  }
  run("update issues set views = (select count(distinct coalesce(user_id, id)) from issue_views where issue_id = $issueId) where id = $issueId", {
    $issueId: issueId
  });
}

export function getMyVoteStatus(issueId: string, userId?: string) {
  if (!userId) return { optionId: null, canceled: false, canceledOptionId: null };
  const optionId =
    get<{ issue_option_id: string }>("select issue_option_id from issue_votes where issue_id = $issueId and user_id = $userId", {
      $issueId: issueId,
      $userId: userId
    })?.issue_option_id ?? null;
  const cancellation =
    get<{ issue_id: string; issue_option_id: string | null }>("select issue_id, issue_option_id from issue_vote_cancellations where issue_id = $issueId and user_id = $userId", {
      $issueId: issueId,
      $userId: userId
    }) ?? null;
  return { optionId, canceled: Boolean(cancellation), canceledOptionId: cancellation?.issue_option_id ?? null };
}

export function getMyVote(issueId: string, userId?: string) {
  return getMyVoteStatus(issueId, userId).optionId;
}

function syncIssueCounters(issueId: string) {
  const participantCount = get<{ count: number }>("select count(*) as count from issue_votes where issue_id = $issueId", {
    $issueId: issueId
  })?.count ?? 0;
  const commentCount = get<{ count: number }>("select count(*) as count from comments where issue_id = $issueId", {
    $issueId: issueId
  })?.count ?? 0;
  run("update issues set participants = $participants, comments_count = $comments, reaction_count = $comments where id = $issueId", {
    $participants: participantCount,
    $comments: commentCount,
    $issueId: issueId
  });
  const options = all<{ id: string; count: number }>(
    `select o.id, count(v.issue_option_id) as count
     from issue_options o
     left join issue_votes v on v.issue_option_id = o.id
     where o.issue_id = $issueId
     group by o.id`,
    { $issueId: issueId }
  );
  for (const option of options) {
    run("update issue_options set votes_count = $count, percent = $percent where id = $id", {
      $count: option.count,
      $percent: participantCount ? Math.round((Number(option.count) / participantCount) * 100) : 0,
      $id: option.id
    });
  }
}

export function voteIssue(issueId: string, optionId: string, userId: string) {
  transaction(() => {
    const canceled = get<{ issue_id: string }>("select issue_id from issue_vote_cancellations where issue_id = $issueId and user_id = $userId", {
      $issueId: issueId,
      $userId: userId
    });
    if (canceled) {
      throw new Error("이미 선택을 취소한 현안에는 다시 투표할 수 없습니다.");
    }

    const existing = get<{ issue_option_id: string }>("select issue_option_id from issue_votes where issue_id = $issueId and user_id = $userId", {
      $issueId: issueId,
      $userId: userId
    });
    if (existing?.issue_option_id && existing.issue_option_id !== optionId) {
      throw new Error("이미 선택한 의견은 다른 의견으로 변경할 수 없습니다. 마이페이지에서 선택취소만 가능합니다.");
    }
    if (existing?.issue_option_id === optionId) return;

    run(
      `insert into issue_votes (issue_id, user_id, issue_option_id, created_at, updated_at)
       values ($issueId, $userId, $optionId, $now, $now)
       on conflict(issue_id, user_id) do nothing`,
      { $issueId: issueId, $userId: userId, $optionId: optionId, $now: now() }
    );
    syncIssueCounters(issueId);
  });
}

export function cancelIssueVote(issueId: string, userId: string) {
  transaction(() => {
    const existing = get<{ issue_option_id: string }>("select issue_option_id from issue_votes where issue_id = $issueId and user_id = $userId", {
      $issueId: issueId,
      $userId: userId
    });
    if (!existing) return;

    run("delete from issue_votes where issue_id = $issueId and user_id = $userId", { $issueId: issueId, $userId: userId });
    run(
      `insert into issue_vote_cancellations (issue_id, user_id, issue_option_id, canceled_at)
       values ($issueId, $userId, $optionId, $now)
       on conflict(issue_id, user_id) do update set issue_option_id = excluded.issue_option_id, canceled_at = excluded.canceled_at`,
      { $issueId: issueId, $userId: userId, $optionId: existing.issue_option_id, $now: now() }
    );
    syncIssueCounters(issueId);
  });
}

function nestComments(comments: Comment[]) {
  const byId = new Map(comments.map((comment) => [comment.id, { ...comment, replies: [] as Comment[] }]));
  const roots: Comment[] = [];
  const findRootParent = (comment: Comment) => {
    let parent = comment.parentId ? byId.get(comment.parentId) : undefined;
    while (parent?.parentId && byId.has(parent.parentId)) parent = byId.get(parent.parentId);
    return parent;
  };
  byId.forEach((comment) => {
    const rootParent = findRootParent(comment);
    if (rootParent && rootParent.id !== comment.id) rootParent.replies.push({ ...comment, replies: [] });
    else roots.push(comment);
  });
  return roots;
}

function isEdited(createdAt: string, updatedAt: string) {
  return createdAt !== updatedAt;
}

export function listComments(issueId: string, sort: CommentSort, currentUserId?: string) {
  const rows = all<CommentRow>(
    `select c.*,
      p.name,
      p.nickname,
      p.avatar_url,
      u.role,
      ${currentUserId ? "exists(select 1 from comment_likes l where l.comment_id = c.id and l.user_id = $currentUserId)" : "0"} as liked_by_me,
      ${currentUserId ? "exists(select 1 from reports r where r.comment_id = c.id and r.reporter_id = $currentUserId)" : "0"} as reported_by_me
     from comments c
     left join profiles p on p.id = c.user_id
     left join users u on u.id = c.user_id
     where c.issue_id = $issueId
     order by ${sort === "likes" ? "c.likes_count desc, c.created_at desc" : "c.created_at desc"}`,
    { $issueId: issueId, $currentUserId: currentUserId ?? null }
  );

  return nestComments(
    rows.map((comment) => ({
      id: comment.id,
      issueId: comment.issue_id,
      parentId: comment.parent_id,
      author: {
        id: comment.user_id,
        nickname: comment.role === "politician" ? comment.name ?? "정치인" : comment.nickname ?? "탈퇴한 사용자",
        role: comment.role ?? undefined,
        avatarUrl: comment.avatar_url ?? undefined
      },
      body: comment.body,
      likes: comment.likes_count,
      likedByMe: Boolean(comment.liked_by_me),
      reported: Boolean(comment.reported_by_me),
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      edited: isEdited(comment.created_at, comment.updated_at),
      replies: []
    }))
  );
}

export function createComment(issueId: string, body: string, userId: string, parentId?: string) {
  if (parentId) {
    const parent = get<{ parent_id: string | null; issue_id: string }>("select parent_id, issue_id from comments where id = $id", {
      $id: parentId
    });
    if (!parent) throw new Error("원댓글을 찾을 수 없습니다.");
    if (parent.parent_id) throw new Error("답글에는 다시 답글을 달 수 없습니다. 원댓글에 답글을 남겨 주세요.");
    if (parent.issue_id !== issueId) throw new Error("댓글 대상 현안이 올바르지 않습니다.");
  }
  transaction(() => {
    run(
      `insert into comments (id, issue_id, parent_id, user_id, body, likes_count, created_at, updated_at)
       values ($id, $issueId, $parentId, $userId, $body, 0, $now, $now)`,
      { $id: randomUUID(), $issueId: issueId, $parentId: parentId ?? null, $userId: userId, $body: body.trim(), $now: now() }
    );
    syncIssueCounters(issueId);
  });
}

export function updateComment(commentId: string, body: string, user: UserProfile) {
  const comment = get<{ user_id: string }>("select user_id from comments where id = $id", { $id: commentId });
  if (!comment) throw new Error("댓글을 찾을 수 없습니다.");
  if (comment.user_id !== user.id && user.role !== "admin") throw new Error("댓글 수정 권한이 없습니다.");
  run("update comments set body = $body, updated_at = $now where id = $id", { $body: body.trim(), $now: now(), $id: commentId });
}

export function deleteComment(commentId: string, user: UserProfile) {
  const comment = get<{ user_id: string; issue_id: string }>("select user_id, issue_id from comments where id = $id", { $id: commentId });
  if (!comment) throw new Error("댓글을 찾을 수 없습니다.");
  if (comment.user_id !== user.id && user.role !== "admin") throw new Error("댓글 삭제 권한이 없습니다.");
  transaction(() => {
    run("delete from comments where id = $id", { $id: commentId });
    syncIssueCounters(comment.issue_id);
  });
}

export function toggleCommentLike(commentId: string, userId: string, liked: boolean) {
  transaction(() => {
    if (liked) run("delete from comment_likes where comment_id = $commentId and user_id = $userId", { $commentId: commentId, $userId: userId });
    else run("insert or ignore into comment_likes (comment_id, user_id, created_at) values ($commentId, $userId, $now)", { $commentId: commentId, $userId: userId, $now: now() });
    const likes = get<{ count: number }>("select count(*) as count from comment_likes where comment_id = $commentId", { $commentId: commentId })?.count ?? 0;
    run("update comments set likes_count = $likes where id = $commentId", { $likes: likes, $commentId: commentId });
  });
}

export function reportComment(commentId: string, userId: string, reason = "user_report") {
  const comment = get<{ user_id: string }>("select user_id from comments where id = $id", { $id: commentId });
  if (!comment) throw new Error("댓글을 찾을 수 없습니다.");
  if (comment.user_id === userId) throw new Error("자신의 댓글은 신고할 수 없습니다.");
  run(
    `insert into reports (id, comment_id, reporter_id, reason, status, created_at, updated_at)
     values ($id, $commentId, $userId, $reason, 'pending', $now, $now)
     on conflict(comment_id, reporter_id) do update set reason = excluded.reason, status = 'pending', updated_at = excluded.updated_at`,
    { $id: randomUUID(), $commentId: commentId, $userId: userId, $reason: reason, $now: now() }
  );
}

function mapRoom(row: ChatRow, politician?: Politician): ChatRoom {
  return {
    id: row.id,
    userId: row.user_id,
    politicianId: row.politician_id,
    politician,
    lastMessage: row.last_message ?? "아직 메시지가 없습니다.",
    lastMessageAt: row.last_message_at ?? row.created_at ?? now(),
    unreadCount: row.unread_count
  };
}

function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    roomId: row.room_id,
    senderId: row.sender_id,
    body: row.body,
    read: Boolean(row.read),
    createdAt: row.created_at
  };
}

export function listChatRooms(userId: string) {
  const politicians = new Map(listPoliticians().map((politician) => [politician.id, politician]));
  return all<ChatRow>(
    `select c.*
     from chats c
     left join politicians p on p.id = c.politician_id
     where c.user_id = $userId or p.user_id = $userId
     order by c.last_message_at desc`,
    { $userId: userId }
  )
    .map((room) => {
      const politician = politicians.get(room.politician_id);
      return politician ? mapRoom(room, politician) : null;
    })
    .filter((room): room is ChatRoom => Boolean(room));
}

export function createOrGetChatRoom(userId: string, politicianId: string) {
  const politician = listPoliticians().find((item) => item.id === politicianId);
  if (!politician) throw new Error("정치인 계정을 찾을 수 없습니다.");
  let room = get<ChatRow>("select * from chats where user_id = $userId and politician_id = $politicianId", { $userId: userId, $politicianId: politicianId });
  if (!room) {
    const id = randomUUID();
    run(
      `insert into chats (id, user_id, politician_id, last_message, last_message_at, unread_count, created_at, updated_at)
       values ($id, $userId, $politicianId, null, $now, 0, $now, $now)`,
      { $id: id, $userId: userId, $politicianId: politicianId, $now: now() }
    );
    room = get<ChatRow>("select * from chats where id = $id", { $id: id });
  }
  return mapRoom(room!, politician);
}

export function deleteChatRoom(roomId: string, user: UserProfile) {
  const room = get<ChatRow>("select * from chats where id = $id", { $id: roomId });
  if (!room) throw new Error("채팅방을 찾을 수 없습니다.");
  if (room.user_id !== user.id && user.role !== "admin") throw new Error("채팅방 삭제 권한이 없습니다.");
  run("delete from chats where id = $id", { $id: roomId });
}

function canAccessChatRoom(room: ChatRow, user: UserProfile) {
  if (room.user_id === user.id || user.role === "admin") return true;
  const politician = get<PoliticianRow>("select * from politicians where id = $id", { $id: room.politician_id });
  return politician?.user_id === user.id;
}

export function listMessages(roomId: string, user: UserProfile) {
  const room = get<ChatRow>("select * from chats where id = $id", { $id: roomId });
  if (!room || !canAccessChatRoom(room, user)) throw new Error("채팅방 접근 권한이 없습니다.");
  return all<MessageRow>("select * from chat_messages where room_id = $roomId order by created_at asc", { $roomId: roomId }).map(mapMessage);
}

export function sendMessage(roomId: string, user: UserProfile, body: string) {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("메시지를 입력해 주세요.");

  const savedId = transaction(() => {
    const room = get<ChatRow>("select * from chats where id = $id", { $id: roomId });
    if (!room || !canAccessChatRoom(room, user)) throw new Error("채팅방 접근 권한이 없습니다.");

    const messageId = randomUUID();
    const timestamp = now();
    run(
      `insert into chat_messages (id, room_id, sender_id, body, read, created_at)
       values ($id, $roomId, $senderId, $body, 0, $now)`,
      { $id: messageId, $roomId: roomId, $senderId: user.id, $body: trimmed, $now: timestamp }
    );
    run("update chats set last_message = $body, last_message_at = $now, unread_count = case when user_id = $senderId then unread_count else unread_count + 1 end, updated_at = $now where id = $roomId", {
      $body: trimmed,
      $now: timestamp,
      $senderId: user.id,
      $roomId: roomId
    });
    return messageId;
  });

  const saved = get<MessageRow>("select * from chat_messages where id = $id", { $id: savedId });
  if (!saved) throw new Error("메시지 저장에 실패했습니다.");
  return mapMessage(saved);
}

export function markChatRead(roomId: string, readerId: string) {
  transaction(() => {
    run("update chat_messages set read = 1 where room_id = $roomId and sender_id <> $readerId", { $roomId: roomId, $readerId: readerId });
    run("update chats set unread_count = 0 where id = $roomId and user_id = $readerId", { $roomId: roomId, $readerId: readerId });
  });
}

export function getAdminStats(user: UserProfile) {
  assertUserRole(user, "admin");
  return {
    users: get<{ count: number }>("select count(*) as count from users")?.count ?? 0,
    participants: get<{ count: number }>("select count(*) as count from issue_votes")?.count ?? 0,
    reports: get<{ count: number }>("select count(*) as count from reports where status = 'pending'")?.count ?? 0,
    hot: get<{ count: number }>("select count(*) as count from issues where hot = 1")?.count ?? 0
  };
}

function buildSlug(input: AdminIssueInput) {
  return (input.slug || input.title.toLowerCase().replace(/\s+/g, "-")).trim();
}

export function upsertIssue(input: AdminIssueInput, user: UserProfile) {
  assertUserRole(user, "admin");
  if (input.options.length !== 4) throw new Error("의견은 반드시 4개여야 합니다.");
  const slug = buildSlug(input);
  if (!slug) throw new Error("Slug 또는 현안 제목을 입력해 주세요.");

  const savedId = transaction(() => {
    const existing = input.id
      ? get<{ id: string }>("select id from issues where id = $id", { $id: input.id })
      : get<{ id: string }>("select id from issues where slug = $slug", { $slug: slug });
    const issueId = input.id ?? existing?.id ?? randomUUID();
    run(
      `insert into issues (id, slug, title, summary, description, hot, published, created_by, created_at, updated_at)
       values ($id, $slug, $title, $summary, $description, $hot, $published, $createdBy, $now, $now)
       on conflict(id) do update set slug = excluded.slug, title = excluded.title, summary = excluded.summary,
        description = excluded.description, hot = excluded.hot, published = excluded.published, updated_at = excluded.updated_at`,
      {
        $id: issueId,
        $slug: slug,
        $title: input.title.trim(),
        $summary: input.summary.trim(),
        $description: input.description.trim(),
        $hot: bool(input.hot),
        $published: bool(input.published),
        $createdBy: user.id,
        $now: now()
      }
    );

    const existingOptions = all<{ id: string }>("select id from issue_options where issue_id = $issueId order by sort_order asc", {
      $issueId: issueId
    });

    input.options.forEach((option, index) => {
      const optionId = option.id || existingOptions[index]?.id || randomUUID();
      run(
        `insert into issue_options (id, issue_id, title, short_text, party_alignment, difference, pros, cons, sort_order, created_at, updated_at)
         values ($id, $issueId, $title, $shortText, $partyAlignment, $difference, $pros, $cons, $sortOrder, $now, $now)
         on conflict(id) do update set title = excluded.title, short_text = excluded.short_text,
          party_alignment = excluded.party_alignment, difference = excluded.difference, pros = excluded.pros,
          cons = excluded.cons, sort_order = excluded.sort_order, updated_at = excluded.updated_at`,
        {
          $id: optionId,
          $issueId: issueId,
          $title: option.title.trim(),
          $shortText: option.shortText.trim(),
          $partyAlignment: option.partyAlignment.trim(),
          $difference: option.difference.trim(),
          $pros: jsonString(option.pros.map((item) => item.trim()).filter(Boolean)),
          $cons: jsonString(option.cons.map((item) => item.trim()).filter(Boolean)),
          $sortOrder: index + 1,
          $now: now()
        }
      );
      run("delete from issue_option_politicians where issue_option_id = $optionId", { $optionId: optionId });
    });

    if (input.newsUrl.trim()) {
      run(
        `insert into news_links (id, issue_id, title, outlet, url)
         values ($id, $issueId, $title, $outlet, $url)
         on conflict(issue_id, url) do update set title = excluded.title, outlet = excluded.outlet`,
        {
          $id: randomUUID(),
          $issueId: issueId,
          $title: input.newsTitle.trim() || input.title.trim(),
          $outlet: input.newsOutlet.trim() || "VoteIt",
          $url: input.newsUrl.trim()
        }
      );
    }
    syncIssueCounters(issueId);
    return issueId;
  });
  return { id: savedId };
}

export function deleteIssue(issueId: string, user: UserProfile) {
  assertUserRole(user, "admin");
  run("delete from issues where id = $id", { $id: issueId });
}

export function listPendingReports(user: UserProfile) {
  assertUserRole(user, "admin");
  return all<Record<string, unknown>>(
    `select r.id, r.reason, r.status, r.created_at, c.id as comment_id, c.body as comment_body, u.phone as reporter_phone
     from reports r
     left join comments c on c.id = r.comment_id
     left join users u on u.id = r.reporter_id
     where r.status = 'pending'
     order by r.created_at desc`
  ).map((report) => ({
    id: report.id,
    reason: report.reason,
    status: report.status,
    created_at: report.created_at,
    comments: { id: report.comment_id, body: report.comment_body },
    users: { phone: report.reporter_phone }
  }));
}

export function resolveReport(reportId: string, status: "resolved" | "dismissed", user: UserProfile) {
  assertUserRole(user, "admin");
  run("update reports set status = $status, updated_at = $now where id = $id", { $status: status, $now: now(), $id: reportId });
}

export function getMyActivity(userId: string) {
  const votes = all<{
    issue_id: string;
    issue_slug: string;
    issue_title: string;
    option_title: string;
    option_text: string;
    created_at: string;
  }>(
    `select v.issue_id, i.slug as issue_slug, i.title as issue_title, o.title as option_title, o.short_text as option_text, v.updated_at as created_at
     from issue_votes v
     join issues i on i.id = v.issue_id
     join issue_options o on o.id = v.issue_option_id
     where v.user_id = $userId
     order by v.updated_at desc`,
    { $userId: userId }
  );
  const comments = all<{
    id: string;
    issue_id: string;
    issue_slug: string;
    issue_title: string;
    parent_id: string | null;
    body: string;
    created_at: string;
    updated_at: string;
  }>(
    `select c.id, c.issue_id, i.slug as issue_slug, i.title as issue_title, c.parent_id, c.body, c.created_at, c.updated_at
     from comments c
     join issues i on i.id = c.issue_id
     where c.user_id = $userId
     order by c.created_at desc`,
    { $userId: userId }
  );
  const likedComments = all<{
    id: string;
    issue_id: string;
    issue_slug: string;
    issue_title: string;
    body: string;
    author_nickname: string;
    liked_at: string;
  }>(
    `select c.id, c.issue_id, i.slug as issue_slug, i.title as issue_title, c.body,
      case when u.role = 'politician' then p.name else p.nickname end as author_nickname,
      l.created_at as liked_at
     from comment_likes l
     join comments c on c.id = l.comment_id
     join issues i on i.id = c.issue_id
     left join profiles p on p.id = c.user_id
     left join users u on u.id = c.user_id
     where l.user_id = $userId
     order by l.created_at desc`,
    { $userId: userId }
  );

  const commentToActivity = (comment: (typeof comments)[number]) => ({
    id: comment.id,
    issueId: comment.issue_id,
    issueSlug: comment.issue_slug,
    issueTitle: comment.issue_title,
    body: comment.body,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at
  });

  return {
    votes: votes.map((vote) => ({
      issueId: vote.issue_id,
      issueSlug: vote.issue_slug,
      issueTitle: vote.issue_title,
      optionTitle: vote.option_title,
      optionText: vote.option_text,
      createdAt: vote.created_at
    })),
    comments: comments.filter((comment) => !comment.parent_id).map(commentToActivity),
    likedComments: likedComments.map((comment) => ({
      id: comment.id,
      issueId: comment.issue_id,
      issueSlug: comment.issue_slug,
      issueTitle: comment.issue_title,
      body: comment.body,
      authorNickname: comment.author_nickname ?? "탈퇴한 사용자",
      likedAt: comment.liked_at
    })),
    replies: comments.filter((comment) => Boolean(comment.parent_id)).map(commentToActivity)
  };
}
