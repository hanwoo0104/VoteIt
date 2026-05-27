import { getSupabaseClient } from "@/services/supabase/client";
import { runSupabaseQuery } from "@/services/supabase/query";
import type { BreakdownPoint, Issue, IssueOption, IssueStatistics, NewsLink } from "@/types";

interface IssueRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  hot: boolean;
  published: boolean;
  views: number;
  participants: number;
  comments_count: number;
  reaction_count: number;
  news_links?: Array<{
    id: string;
    title: string;
    outlet: string;
    url: string;
  }>;
  issue_options?: Array<{
    id: string;
    issue_id: string;
    title: string;
    short_text: string;
    gradient: string | null;
    party_alignment: string | null;
    difference: string | null;
    pros: string[] | null;
    cons: string[] | null;
    votes_count: number | null;
    percent: number | null;
    sort_order: number | null;
    issue_option_politicians?: Array<{ politician_id: string }>;
  }>;
}

interface StatisticRow {
  issue_option_id: string;
  age: BreakdownPoint[];
  gender: BreakdownPoint[];
  region: BreakdownPoint[];
  income: BreakdownPoint[];
}

const ISSUE_SELECT = `
  id,
  slug,
  title,
  summary,
  description,
  hot,
  published,
  views,
  participants,
  comments_count,
  reaction_count,
  news_links(id, title, outlet, url),
  issue_options(
    id,
    issue_id,
    title,
    short_text,
    gradient,
    party_alignment,
    difference,
    pros,
    cons,
    votes_count,
    percent,
    sort_order,
    issue_option_politicians(politician_id)
  )
`;

function mapOption(row: NonNullable<IssueRow["issue_options"]>[number], participants: number): IssueOption {
  const votesCount = row.votes_count ?? 0;
  const percent = participants > 0 ? Math.round((votesCount / participants) * 100) : row.percent ?? 0;

  return {
    id: row.id,
    issueId: row.issue_id,
    title: row.title,
    shortText: row.short_text,
    gradient: row.gradient ?? "linear-gradient(135deg,#244868,#345f8f,#e04b5d)",
    partyAlignment: row.party_alignment ?? "연결된 정치 성향 정보가 없습니다.",
    politicianIds: row.issue_option_politicians?.map((item) => item.politician_id) ?? [],
    difference: row.difference ?? "",
    pros: row.pros ?? [],
    cons: row.cons ?? [],
    votesCount,
    percent,
    sortOrder: row.sort_order ?? 0
  };
}

async function fetchStatistics(issueId: string): Promise<Record<string, IssueStatistics>> {
  const client = getSupabaseClient();
  const { data, error } = await runSupabaseQuery(
    client.rpc("get_issue_statistics", { p_issue_id: issueId }),
    "현안 통계"
  );

  if (error) {
    throw new Error(error.message);
  }

  return Object.fromEntries(
    ((data ?? []) as StatisticRow[]).map((row) => [
      row.issue_option_id,
      {
        age: row.age,
        gender: row.gender,
        region: row.region,
        income: row.income
      }
    ])
  );
}

function mapIssue(row: IssueRow, statistics: Record<string, IssueStatistics> = {}): Issue {
  const options = [...(row.issue_options ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    hot: row.hot,
    published: row.published,
    views: row.views,
    participants: row.participants,
    commentsCount: row.comments_count,
    reactionCount: row.reaction_count,
    newsLinks: (row.news_links ?? []) as NewsLink[],
    options: options.map((option) => mapOption(option, row.participants)),
    statistics
  };
}

export async function fetchIssues() {
  const client = getSupabaseClient();
  const { data, error } = await runSupabaseQuery(
    client
      .from("issues")
      .select(ISSUE_SELECT)
      .eq("published", true)
      .order("hot", { ascending: false })
      .order("created_at", { ascending: false }),
    "현안 목록"
  );

  if (error) throw new Error(error.message);
  return ((data ?? []) as IssueRow[]).map((row) => mapIssue(row));
}

export async function fetchIssueBySlug(slug: string) {
  const client = getSupabaseClient();
  const { data, error } = await runSupabaseQuery(
    client.from("issues").select(ISSUE_SELECT).eq("slug", slug).single<IssueRow>(),
    "현안 상세"
  );

  if (error) throw new Error(error.message);
  if (!data) throw new Error("현안을 찾을 수 없습니다.");

  return mapIssue(data, await fetchStatistics(data.id));
}

export async function recordIssueView(issueId: string, userId?: string) {
  const client = getSupabaseClient();
  await runSupabaseQuery(
    client.from("issue_views").insert({
      issue_id: issueId,
      user_id: userId ?? null
    }),
    "현안 조회"
  );
}

export async function fetchMyVote(issueId: string, userId?: string) {
  if (!userId) return null;
  const client = getSupabaseClient();
  const { data, error } = await runSupabaseQuery(
    client
      .from("issue_votes")
      .select("issue_option_id")
      .eq("issue_id", issueId)
      .eq("user_id", userId)
      .maybeSingle<{ issue_option_id: string }>(),
    "내 투표"
  );

  if (error) throw new Error(error.message);
  return data?.issue_option_id ?? null;
}

export async function voteIssue(issueId: string, optionId: string, userId: string) {
  const client = getSupabaseClient();
  const { error } = await runSupabaseQuery(
    client.from("issue_votes").upsert(
      {
        issue_id: issueId,
        user_id: userId,
        issue_option_id: optionId
      },
      { onConflict: "issue_id,user_id" }
    ),
    "투표 저장"
  );

  if (error) throw new Error(error.message);
}
