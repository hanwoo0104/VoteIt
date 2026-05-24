import { getIssueById, getPoliticianById } from "@/services/data/mockData";
import type { AIAnalysis } from "@/types";

export const analysisLoadingSteps = [
  "AI가 의견 차이를 분석 중...",
  "장단점을 정리하는 중...",
  "관련 정치인 발언을 분석 중..."
];

export async function getMockAnalysis(issueId: string, optionId: string): Promise<AIAnalysis> {
  await new Promise((resolve) => setTimeout(resolve, 1700));

  const issue = getIssueById(issueId);
  const option = issue?.options.find((item) => item.id === optionId);

  if (!issue || !option) {
    throw new Error("분석할 의견을 찾지 못했어요.");
  }

  const politicians = option.politicianIds
    .map((id) => getPoliticianById(id))
    .filter(Boolean)
    .map((politician) => `${politician!.name} ${politician!.role}은 ${option.title} 관점과 가까운 메시지를 내고 있어요.`);

  return {
    optionId,
    alignment: option.partyAlignment,
    difference: option.difference,
    pros: option.pros,
    cons: option.cons,
    politicianNotes:
      politicians.length > 0
        ? politicians
        : ["현재 연결된 정치인은 없지만, 관련 발언이 등록되면 이 영역에 자동으로 정리됩니다."],
    closing:
      "이 선택은 절대적인 정답이라기보다 우선순위의 표현에 가까워요. 다른 의견의 장점도 함께 보면 토론에서 설득력이 더 좋아집니다."
  };
}
