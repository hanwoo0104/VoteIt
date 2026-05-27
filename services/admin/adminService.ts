import { getSupabaseClient } from "@/services/supabase/client";

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

interface IssueIdRow {
  id: string;
}

interface OptionIdRow {
  id: string;
}

function compactTextList(items: string[]) {
  return items.map((item) => item.trim()).filter(Boolean);
}

function buildSlug(input: AdminIssueInput) {
  return (input.slug || input.title.toLowerCase().replace(/\s+/g, "-")).trim();
}

export async function fetchAdminStats() {
  const client = getSupabaseClient();
  const [users, votes, reports, issues] = await Promise.all([
    client.from("users").select("id", { count: "exact", head: true }),
    client.from("issue_votes").select("issue_id", { count: "exact", head: true }),
    client.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    client.from("issues").select("id", { count: "exact", head: true }).eq("hot", true)
  ]);

  return {
    users: users.count ?? 0,
    participants: votes.count ?? 0,
    reports: reports.count ?? 0,
    hot: issues.count ?? 0
  };
}

export async function upsertAdminIssue(input: AdminIssueInput) {
  if (input.options.length !== 4) {
    throw new Error("의견은 반드시 4개여야 합니다.");
  }

  const client = getSupabaseClient();
  const slug = buildSlug(input);
  if (!slug) throw new Error("Slug 또는 현안 제목을 입력해 주세요.");

  const existingIssue = input.id
    ? null
    : await client.from("issues").select("id").eq("slug", slug).maybeSingle<IssueIdRow>();

  if (existingIssue?.error) {
    throw new Error(existingIssue.error.message);
  }

  const issueId = input.id ?? existingIssue?.data?.id;
  const issuePayload: Record<string, unknown> = {
    slug,
    title: input.title.trim(),
    summary: input.summary.trim(),
    description: input.description.trim(),
    hot: input.hot,
    published: input.published
  };

  if (issueId) {
    issuePayload.id = issueId;
  }

  const createdInThisSave = !issueId;
  let savedIssueId: string | null = null;

  try {
    const { data: issue, error } = await client
      .from("issues")
      .upsert(issuePayload, { onConflict: "id" })
      .select("id")
      .single<IssueIdRow>();

    if (error) throw new Error(error.message);
    savedIssueId = issue.id;

    const { data: existingOptions, error: existingOptionsError } = await client
      .from("issue_options")
      .select("id")
      .eq("issue_id", issue.id)
      .order("sort_order", { ascending: true })
      .returns<OptionIdRow[]>();

    if (existingOptionsError) throw new Error(existingOptionsError.message);

    const options: OptionIdRow[] = [];

    for (const [index, option] of input.options.entries()) {
      const optionId = option.id ?? existingOptions?.[index]?.id;
      const optionPayload: Record<string, unknown> = {
        issue_id: issue.id,
        title: option.title.trim(),
        short_text: option.shortText.trim(),
        party_alignment: option.partyAlignment.trim(),
        difference: option.difference.trim(),
        pros: compactTextList(option.pros),
        cons: compactTextList(option.cons),
        sort_order: index + 1
      };

      const query = optionId
        ? client.from("issue_options").upsert({ id: optionId, ...optionPayload }, { onConflict: "id" })
        : client.from("issue_options").insert(optionPayload);

      const { data: savedOption, error: optionError } = await query.select("id").single<OptionIdRow>();
      if (optionError) throw new Error(optionError.message);
      options.push(savedOption);
    }

    if (input.newsUrl.trim()) {
      const { error: newsError } = await client.from("news_links").upsert(
        {
          issue_id: issue.id,
          title: input.newsTitle.trim() || input.title.trim(),
          outlet: input.newsOutlet.trim() || "VoteIt",
          url: input.newsUrl.trim()
        },
        { onConflict: "issue_id,url" }
      );

      if (newsError) throw new Error(newsError.message);
    }

    const optionIds = options.map((option) => option.id);
    if (optionIds.length) {
      const { error: deleteLinksError } = await client
        .from("issue_option_politicians")
        .delete()
        .in("issue_option_id", optionIds);

      if (deleteLinksError) throw new Error(deleteLinksError.message);
    }

    await Promise.all(
      input.options.map(async (option, index) => {
        if (!option.politicianId || !options[index]) return;
        const { error: linkError } = await client.from("issue_option_politicians").upsert(
          {
            issue_option_id: options[index].id,
            politician_id: option.politicianId
          },
          { onConflict: "issue_option_id,politician_id" }
        );
        if (linkError) throw new Error(linkError.message);
      })
    );

    return { id: issue.id };
  } catch (error) {
    if (createdInThisSave && savedIssueId) {
      await client.from("issues").delete().eq("id", savedIssueId);
    }
    throw error;
  }
}

export async function deleteAdminIssue(issueId: string) {
  const client = getSupabaseClient();
  const { error } = await client.from("issues").delete().eq("id", issueId);
  if (error) throw new Error(error.message);
}

export async function fetchPendingReports() {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("reports")
    .select("id, reason, status, created_at, comments(id, body), users!reports_reporter_id_fkey(phone)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function resolveReport(reportId: string, status: "resolved" | "dismissed") {
  const client = getSupabaseClient();
  const { error } = await client.from("reports").update({ status }).eq("id", reportId);
  if (error) throw new Error(error.message);
}
