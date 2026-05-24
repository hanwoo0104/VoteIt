import { IssueDetail } from "@/features/issues/IssueDetail";

export default async function IssuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <IssueDetail issueId={id} />;
}
