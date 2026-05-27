import type { AIAnalysis, Issue, IssueOption, Politician } from "@/types";

export const analysisLoadingSteps = [
  "AI가 의견 차이를 분석 중...",
  "장단점을 정리하는 중...",
  "관련 정치인 발언을 분석 중..."
];

export async function getMockAnalysis(
  issue: Issue,
  option: IssueOption,
  politicians: Politician[] = []
): Promise<AIAnalysis> {
  await new Promise((resolve) => setTimeout(resolve, 900));

  const connected = politicians.filter((politician) => option.politicianIds.includes(politician.id));

  return {
    optionId: option.id,
    alignment: option.partyAlignment,
    difference: option.difference || `${issue.title}에 대해 '${option.title}' 관점은 우선순위가 분명한 선택입니다.`,
    pros: option.pros,
    cons: option.cons,
    politicianNotes:
      connected.length > 0
        ? connected.map((politician) => `${politician.name} ${politician.role}의 공개 입장과 일부 쟁점이 연결됩니다.`)
        : ["연결된 정치인 발언이 등록되면 이 영역에 자동으로 요약됩니다."],
    closing:
      "이 분석은 사용자가 선택한 관점의 강점과 한계를 균형 있게 보기 위한 보조 자료입니다. 반대 의견의 좋은 근거까지 함께 읽으면 토론 품질이 높아집니다."
  };
}
