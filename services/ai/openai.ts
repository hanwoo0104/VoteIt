import type { AIAnalysis } from "@/types";

export interface OpenAIAnalysisPayload {
  issueId: string;
  optionId: string;
  userContext?: string;
}

export async function getOpenAIAnalysis(_payload: OpenAIAnalysisPayload): Promise<AIAnalysis> {
  throw new Error("OpenAI 연동은 데모에서 비활성화되어 있습니다. 이 파일에 Responses API 호출을 연결하면 됩니다.");
}
