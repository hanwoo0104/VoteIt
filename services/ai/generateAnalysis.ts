import { getMockAnalysis } from "@/services/ai/mockAnalysis";
import type { AIAnalysis, Issue, IssueOption, Politician } from "@/types";

export interface GenerateAnalysisInput {
  issue: Issue;
  option: IssueOption;
  politicians?: Politician[];
}

export async function generateAnalysis(input: GenerateAnalysisInput): Promise<AIAnalysis> {
  const response = await fetch("/api/ai/analysis", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (response.ok) {
    return (await response.json()) as AIAnalysis;
  }

  return getMockAnalysis(input.issue, input.option, input.politicians);
}
