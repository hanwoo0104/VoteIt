import type { AIAnalysis, Issue, IssueOption, Politician } from "@/types";

export const analysisLoadingSteps = [
  "AI가 의견 차이를 분석 중...",
  "장단점을 정리하는 중...",
  "토론 관점을 정리하는 중..."
];

export async function getMockAnalysis(
  issue: Issue,
  option: IssueOption,
  _politicians: Politician[] = []
): Promise<AIAnalysis> {
  await new Promise((resolve) => setTimeout(resolve, 900));

  return {
    optionId: option.id,
    alignment: option.partyAlignment,
    difference: option.difference || `${issue.title}에 대해 '${option.title}' 관점은 우선순위가 분명한 선택입니다.`,
    pros: option.pros,
    cons: option.cons,
    politicianNotes: [],
    closing:
      "이 분석은 사용자가 선택한 관점의 강점과 한계를 균형 있게 보기 위한 보조 자료입니다. 반대 의견의 좋은 근거까지 함께 읽으면 토론 품질이 높아집니다."
  };
}
