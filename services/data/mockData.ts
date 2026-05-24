import type { ChatMessage, ChatRoom, Comment, Issue, IssueOption, IssueStatistics, Politician } from "@/types";

const now = Date.now();

const timeAgo = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

const optionStats = (
  age: number[],
  gender: number[],
  region: number[],
  income: number[]
): IssueStatistics => ({
  age: [
    { label: "20대", value: age[0] },
    { label: "30대", value: age[1] },
    { label: "40대", value: age[2] },
    { label: "50대+", value: age[3] }
  ],
  gender: [
    { label: "여성", value: gender[0] },
    { label: "남성", value: gender[1] },
    { label: "기타", value: gender[2] }
  ],
  region: [
    { label: "수도권", value: region[0] },
    { label: "충청", value: region[1] },
    { label: "영남", value: region[2] },
    { label: "호남", value: region[3] },
    { label: "강원/제주", value: region[4] }
  ],
  income: [
    { label: "200 미만", value: income[0] },
    { label: "200-400", value: income[1] },
    { label: "400-700", value: income[2] },
    { label: "700 이상", value: income[3] }
  ]
});

const baseStats = {
  continuity: optionStats([24, 35, 48, 57], [43, 54, 3], [42, 38, 55, 31, 29], [22, 41, 53, 61]),
  power: optionStats([51, 44, 35, 28], [52, 45, 3], [48, 42, 33, 53, 46], [47, 45, 37, 26]),
  decentral: optionStats([43, 48, 49, 42], [49, 48, 3], [51, 56, 41, 57, 50], [39, 48, 52, 49]),
  statusquo: optionStats([29, 25, 31, 38], [38, 59, 3], [35, 28, 39, 27, 34], [34, 30, 28, 33])
};

export const politicians: Politician[] = [
  {
    id: "pol-park",
    name: "박서연",
    party: "민주미래당",
    role: "국회의원",
    region: "서울",
    avatarUrl: "/avatars/politician-1.svg",
    online: true,
    status: "청년 주거와 AI 정책 질의 응답 중",
    tags: ["청년", "주거", "디지털"]
  },
  {
    id: "pol-kim",
    name: "김도윤",
    party: "국민개혁당",
    role: "정책위 부의장",
    region: "부산",
    avatarUrl: "/avatars/politician-2.svg",
    online: true,
    status: "개헌 토론방 실시간 참여",
    tags: ["개헌", "권력구조", "균형발전"]
  },
  {
    id: "pol-lee",
    name: "이하린",
    party: "녹색전환당",
    role: "지역위원장",
    region: "광주",
    avatarUrl: "/avatars/politician-3.svg",
    online: false,
    status: "오늘 오후 8시 답변 예정",
    tags: ["의료", "기후", "지역"]
  },
  {
    id: "pol-choi",
    name: "최민준",
    party: "무소속",
    role: "시장",
    region: "대전",
    avatarUrl: "/avatars/politician-4.svg",
    online: true,
    status: "지역 균형 발전 의견 수렴 중",
    tags: ["행정", "교통", "예산"]
  }
];

function option(
  issueId: string,
  id: string,
  title: string,
  shortText: string,
  gradient: string,
  percent: number,
  partyAlignment: string,
  politicianIds: string[],
  difference: string,
  pros: string[],
  cons: string[]
): IssueOption {
  return {
    id,
    issueId,
    title,
    shortText,
    gradient,
    percent,
    partyAlignment,
    politicianIds,
    difference,
    pros,
    cons
  };
}

const commentsFor = (issueId: string): Comment[] => [
  {
    id: `${issueId}-c1`,
    issueId,
    author: { id: "u-1", nickname: "생활정치러" },
    body: "찬반만 누르는 것보다 왜 그렇게 생각하는지 비교되는 점이 좋아요. 숫자로 보니까 생각이 조금 바뀌네요.",
    likes: 42,
    createdAt: timeAgo(18),
    replies: [
      {
        id: `${issueId}-c1-r1`,
        issueId,
        parentId: `${issueId}-c1`,
        author: { id: "u-2", nickname: "서초직장인" },
        body: "저도요. 특히 연령대별로 다른 이유가 보이는 게 흥미롭습니다.",
        likes: 8,
        createdAt: timeAgo(11),
        replies: []
      }
    ]
  },
  {
    id: `${issueId}-c2`,
    issueId,
    author: { id: "u-3", nickname: "중도탐험" },
    body: "정책의 취지는 공감하지만 실행 과정에서 감시 장치가 같이 설계되어야 한다고 봅니다.",
    likes: 31,
    createdAt: timeAgo(47),
    replies: []
  },
  {
    id: `${issueId}-c3`,
    issueId,
    author: { id: "u-4", nickname: "동네유권자" },
    body: "정치인 답변이 실제 공약과 연결되면 시연 때 설득력이 더 클 것 같아요.",
    likes: 17,
    createdAt: timeAgo(96),
    replies: []
  }
];

export const issues: Issue[] = [
  {
    id: "presidential-term-reform",
    title: "대통령의 연임 개헌에 대한 나의 생각은?",
    summary: "대통령 4년 연임제 도입과 권력구조 개편을 함께 논의해야 할까요?",
    description:
      "현행 5년 단임제는 정권 교체의 긴장감을 만들지만, 중장기 정책의 연속성이 약하다는 지적도 있습니다. 연임제 도입, 권력 분산, 현행 유지 사이의 균형을 비교해 봅니다.",
    hot: true,
    published: true,
    views: 128934,
    participants: 24812,
    commentsCount: 384,
    reactionCount: 734,
    newsLinks: [
      {
        id: "news-term-1",
        title: "권력구조 개편 논의 다시 수면 위로",
        outlet: "VoteIt 브리핑",
        url: "https://example.com/news/term-reform"
      },
      {
        id: "news-term-2",
        title: "연임제와 분권형 개헌의 쟁점",
        outlet: "정책노트",
        url: "https://example.com/news/decentral"
      }
    ],
    options: [
      option(
        "presidential-term-reform",
        "continuity",
        "정책 연속성 강화 필요",
        "정책의 연속성이 높아지고 대통령이 국민 평가를 의식해 더 책임 있게 국정을 운영할 것이다.",
        "linear-gradient(135deg, #244868 0%, #345f8f 50%, #e04b5d 100%)",
        32,
        "국민개혁당 개헌특위와 가까운 입장",
        ["pol-kim"],
        "연임제 찬성은 정책 성과에 대한 중간 평가를 제도화한다는 점에서 현행 유지와 다릅니다.",
        ["장기 국정과제의 추진력이 높아질 수 있어요.", "성과가 낮은 정부를 선거로 교체할 명분도 명확해져요."],
        ["현직 대통령 프리미엄이 커질 수 있어요.", "선거 전략이 국정 운영을 과도하게 좌우할 수 있어요."]
      ),
      option(
        "presidential-term-reform",
        "power",
        "권력 집중 위험",
        "대통령에게 권력이 지나치게 집중되어 장기 집권과 권력 남용 위험이 커질 것이다.",
        "linear-gradient(135deg, #e4233f 0%, #c83e54 48%, #244868 100%)",
        26,
        "민주미래당 견제론 그룹과 가까운 입장",
        ["pol-park"],
        "권력 집중 우려는 임기 자체보다 견제 장치의 부재를 핵심 문제로 봅니다.",
        ["권력 남용 가능성을 먼저 점검하게 만들어요.", "국회와 사법부 견제 장치를 함께 논의하게 해요."],
        ["정책 연속성 문제를 해결하지 못할 수 있어요.", "모든 개헌 논의를 위험 프레임으로만 볼 수 있어요."]
      ),
      option(
        "presidential-term-reform",
        "decentral",
        "분권형 개헌 병행 필요",
        "대통령 권한 분산과 국회·지방정부의 견제 강화 같은 분권형 개헌과 함께 추진되어야 한다.",
        "linear-gradient(135deg, #244868 0%, #2b6f82 46%, #d94b5e 100%)",
        29,
        "지방분권 연대와 가까운 입장",
        ["pol-choi"],
        "연임 여부보다 권한 배분 설계를 먼저 보자는 절충형 관점입니다.",
        ["찬반 양쪽의 우려를 제도 설계로 흡수할 수 있어요.", "지방정부와 국회의 책임성을 함께 키울 수 있어요."],
        ["논의 범위가 넓어져 합의 속도가 느릴 수 있어요.", "세부 설계가 불명확하면 메시지가 흐려질 수 있어요."]
      ),
      option(
        "presidential-term-reform",
        "statusquo",
        "현행 유지",
        "단임제의 장점을 유지하고, 권력 견제와 정책 지속성은 법률과 국정 운영 방식으로 보완해야 한다.",
        "linear-gradient(135deg, #4a5568 0%, #2d3748 50%, #23445f 100%)",
        13,
        "제도 안정성을 강조하는 중도 그룹과 가까운 입장",
        ["pol-lee"],
        "개헌보다 현재 제도 안에서 운영 방식을 개선하는 데 무게를 둡니다.",
        ["큰 제도 변경의 사회적 비용을 줄일 수 있어요.", "권력 집중 우려를 구조적으로 피할 수 있어요."],
        ["정책 단절 문제는 계속 남을 수 있어요.", "현행 제도에 대한 시민 피로감을 해소하기 어려워요."]
      )
    ],
    statistics: baseStats,
    comments: commentsFor("presidential-term-reform")
  },
  {
    id: "medical-school-quota",
    title: "의대 정원 확대, 어디까지 필요할까?",
    summary: "지역 의료 공백 해소와 의료 교육의 질 사이에서 적정 확대 폭을 비교합니다.",
    description:
      "필수 의료와 지역 의료 인력 부족은 오래된 문제지만, 급격한 증원은 교육 질과 수련 환경에 부담을 줄 수 있습니다. 단계적 확대, 대규모 확대, 지역의사제 병행, 현행 유지 의견을 살핍니다.",
    hot: true,
    published: true,
    views: 104281,
    participants: 19843,
    commentsCount: 271,
    reactionCount: 562,
    newsLinks: [
      { id: "news-med-1", title: "지역 필수의료 인력 공백 진단", outlet: "정책노트", url: "https://example.com/news/medical" }
    ],
    options: [
      option("medical-school-quota", "med-step", "단계적 확대", "교육 인프라와 병행해 매년 점진적으로 늘려야 한다.", "linear-gradient(135deg,#244868,#4472a6,#e15a6a)", 38, "중도 보건의료 개혁안과 가까운 입장", ["pol-lee"], "속도보다 지속 가능성을 중시합니다.", ["교육 질 저하를 줄여요.", "의료계와 합의 여지가 커요."], ["효과가 늦게 나타날 수 있어요.", "지역 공백이 당장 해소되기 어려워요."]),
      option("medical-school-quota", "med-bold", "대규모 확대", "부족 규모를 감안해 빠르고 크게 늘려야 한다.", "linear-gradient(135deg,#e4233f,#d45564,#244868)", 25, "강한 공급 확대론과 가까운 입장", ["pol-kim"], "의사 수 부족을 핵심 원인으로 봅니다.", ["지역과 필수의료 공급을 빠르게 늘릴 수 있어요.", "경쟁 완화 효과를 기대할 수 있어요."], ["수련 병원과 교수 확보가 부담이에요.", "단기 갈등 비용이 커질 수 있어요."]),
      option("medical-school-quota", "med-region", "지역의사제 병행", "정원 확대와 함께 지역 근무 의무와 지원책이 필요하다.", "linear-gradient(135deg,#25636f,#2f7f8d,#e05263)", 29, "지역균형 의료 그룹과 가까운 입장", ["pol-choi"], "단순 증원보다 배치 구조를 함께 봅니다.", ["실제 지역 공백 해결에 직접적이에요.", "장학금·주거 지원과 묶어 설계할 수 있어요."], ["직업 선택 자유 논쟁이 생길 수 있어요.", "의무 기간 종료 후 이탈 가능성이 있어요."]),
      option("medical-school-quota", "med-hold", "현행 유지", "정원보다 근무 환경과 수가 개선이 먼저다.", "linear-gradient(135deg,#4a5568,#2d3748,#244868)", 8, "의료체계 개선 우선론과 가까운 입장", ["pol-park"], "인력 총량보다 필수의료 유인을 우선합니다.", ["필수의료 현장의 원인을 정밀하게 봐요.", "교육 질을 안정적으로 유지할 수 있어요."], ["인력 부족 체감은 계속될 수 있어요.", "증원 요구에 답이 부족해 보일 수 있어요."])
    ],
    statistics: {
      "med-step": optionStats([45, 46, 43, 39], [50, 47, 3], [47, 43, 39, 45, 41], [42, 45, 44, 40]),
      "med-bold": optionStats([28, 31, 36, 42], [43, 54, 3], [36, 32, 44, 31, 37], [31, 34, 36, 42]),
      "med-region": optionStats([36, 40, 42, 44], [49, 48, 3], [39, 52, 41, 55, 53], [35, 42, 43, 44]),
      "med-hold": optionStats([11, 9, 12, 16], [37, 60, 3], [10, 12, 15, 8, 11], [14, 10, 9, 12])
    },
    comments: commentsFor("medical-school-quota")
  },
  {
    id: "youth-housing",
    title: "청년 주거 정책, 현금 지원 vs 공급 확대?",
    summary: "월세 부담 완화와 공공임대·도심 공급 확대의 우선순위를 묻습니다.",
    description:
      "청년 주거 불안은 소득, 지역, 교통과 맞물린 문제입니다. 즉각 지원, 공급 확대, 금융 지원, 규제 완화의 효과와 한계를 비교합니다.",
    hot: true,
    published: true,
    views: 89411,
    participants: 17214,
    commentsCount: 198,
    reactionCount: 489,
    newsLinks: [
      { id: "news-home-1", title: "청년 1인 가구 주거비 부담 분석", outlet: "도시정책랩", url: "https://example.com/news/housing" }
    ],
    options: [
      option("youth-housing", "housing-cash", "월세 직접 지원", "당장 체감되는 주거비를 낮추기 위해 현금성 지원을 확대한다.", "linear-gradient(135deg,#e4233f,#d05261,#244868)", 31, "청년 생활비 지원론과 가까운 입장", ["pol-park"], "즉각적인 부담 완화에 초점을 둡니다.", ["정책 체감이 빠릅니다.", "저소득 청년에게 직접 도움이 됩니다."], ["임대료 상승으로 전가될 수 있습니다.", "재정 지속성이 쟁점입니다."]),
      option("youth-housing", "housing-supply", "도심 공급 확대", "교통 좋은 지역의 공공임대와 소형 주택 공급을 늘린다.", "linear-gradient(135deg,#244868,#366999,#e75a68)", 36, "도시 공급 확대론과 가까운 입장", ["pol-choi"], "가격의 구조적 원인을 공급 부족으로 봅니다.", ["장기 가격 안정에 도움이 됩니다.", "직주근접 문제를 함께 다룹니다."], ["사업 기간이 길고 갈등이 큽니다.", "입지 선정이 어려울 수 있습니다."]),
      option("youth-housing", "housing-loan", "보증금 금융 지원", "저리 대출과 보증보험으로 초기 비용 장벽을 낮춘다.", "linear-gradient(135deg,#255b76,#2c817a,#d95565)", 22, "금융 접근성 개선론과 가까운 입장", ["pol-kim"], "목돈 부족 문제를 해결하려는 접근입니다.", ["초기 진입 장벽을 낮춥니다.", "예산 대비 지원 범위를 넓힐 수 있습니다."], ["부채 부담이 남습니다.", "소득이 낮으면 체감이 제한적입니다."]),
      option("youth-housing", "housing-market", "규제 완화", "민간 임대 공급을 늘리도록 세제와 용도 규제를 완화한다.", "linear-gradient(135deg,#4a5568,#35516d,#244868)", 11, "민간 공급 촉진론과 가까운 입장", ["pol-lee"], "민간 참여를 통해 공급 속도를 높이자는 관점입니다.", ["민간 자본을 활용할 수 있습니다.", "행정 부담이 줄 수 있습니다."], ["공공성 확보가 어렵습니다.", "취약계층 보호 장치가 필요합니다."])
    ],
    statistics: {
      "housing-cash": optionStats([58, 38, 24, 18], [55, 42, 3], [44, 36, 29, 39, 34], [61, 43, 24, 15]),
      "housing-supply": optionStats([42, 48, 53, 49], [47, 50, 3], [50, 46, 43, 47, 41], [37, 49, 54, 52]),
      "housing-loan": optionStats([31, 35, 29, 22], [49, 48, 3], [32, 34, 28, 33, 27], [28, 37, 32, 25]),
      "housing-market": optionStats([14, 19, 27, 34], [36, 61, 3], [18, 21, 30, 20, 24], [12, 17, 27, 36])
    },
    comments: commentsFor("youth-housing")
  },
  {
    id: "ai-regulation",
    title: "AI 규제법, 혁신과 안전의 균형은?",
    summary: "고위험 AI 규제, 투명성 의무, 산업 경쟁력 사이의 기준을 비교합니다.",
    description:
      "AI 서비스가 일상과 산업에 빠르게 들어오면서 안전성, 저작권, 개인정보, 차별 방지 기준이 중요해졌습니다. 강한 사전 규제부터 자율 규제까지 선택지를 비교합니다.",
    hot: false,
    published: true,
    views: 73802,
    participants: 14220,
    commentsCount: 151,
    reactionCount: 376,
    newsLinks: [
      { id: "news-ai-1", title: "고위험 AI 기준과 기업 부담", outlet: "테크정책", url: "https://example.com/news/ai-law" }
    ],
    options: [
      option("ai-regulation", "ai-strong", "강한 사전 규제", "고위험 AI는 출시 전 안전성 심사를 의무화한다.", "linear-gradient(135deg,#e4233f,#c64c5d,#244868)", 27, "안전 우선 규제론과 가까운 입장", ["pol-lee"], "피해 예방을 혁신 속도보다 우선합니다.", ["사회적 위험을 선제적으로 줄입니다.", "책임 소재가 명확해집니다."], ["스타트업 진입 장벽이 높아질 수 있습니다.", "심사 기준이 느리면 혁신을 막을 수 있습니다."]),
      option("ai-regulation", "ai-risk", "위험 기반 규제", "위험 등급별로 의무를 달리하고 저위험 서비스는 완화한다.", "linear-gradient(135deg,#244868,#346f91,#e15464)", 42, "디지털 균형론과 가까운 입장", ["pol-park"], "모든 AI를 같은 강도로 보지 않는 절충안입니다.", ["안전과 혁신을 구분해 설계합니다.", "현장 적용 가능성이 높습니다."], ["위험 등급 판정이 논쟁적입니다.", "감독 역량이 필요합니다."]),
      option("ai-regulation", "ai-open", "투명성 의무 중심", "AI 생성 표시, 학습 데이터 설명, 이의제기권을 우선 도입한다.", "linear-gradient(135deg,#27516e,#2e7b7c,#db5364)", 21, "이용자 권리 강화론과 가까운 입장", ["pol-kim"], "통제보다 설명과 선택권을 중시합니다.", ["이용자의 판단권을 키웁니다.", "기업 부담이 상대적으로 낮습니다."], ["위험 자체를 막기엔 부족할 수 있습니다.", "표시 의무가 형식화될 수 있습니다."]),
      option("ai-regulation", "ai-self", "자율 규제", "산업 성장을 위해 민간 가이드라인과 사후 책임을 중심으로 한다.", "linear-gradient(135deg,#4a5568,#314b65,#244868)", 10, "산업 경쟁력 우선론과 가까운 입장", ["pol-choi"], "빠른 기술 변화에 민간이 더 잘 대응한다는 관점입니다.", ["서비스 출시와 실험이 빨라집니다.", "글로벌 경쟁에 유리할 수 있습니다."], ["피해 발생 후 대응이 늦을 수 있습니다.", "약한 기업은 기준을 지키기 어렵습니다."])
    ],
    statistics: {
      "ai-strong": optionStats([31, 29, 35, 42], [52, 45, 3], [29, 31, 35, 36, 34], [35, 30, 28, 26]),
      "ai-risk": optionStats([48, 52, 49, 43], [49, 48, 3], [51, 47, 46, 48, 45], [43, 50, 52, 49]),
      "ai-open": optionStats([35, 33, 30, 25], [51, 46, 3], [34, 36, 27, 32, 29], [30, 34, 32, 26]),
      "ai-self": optionStats([16, 19, 24, 29], [37, 60, 3], [18, 20, 25, 17, 21], [14, 18, 24, 31])
    },
    comments: commentsFor("ai-regulation")
  },
  {
    id: "regional-balance",
    title: "지역 균형 발전, 예산을 어디에 집중할까?",
    summary: "수도권 집중 완화와 지역 성장 거점 전략의 우선순위를 비교합니다.",
    description:
      "인구, 일자리, 대학, 의료가 수도권에 집중되며 지역 소멸 우려가 커지고 있습니다. 공공기관 이전, 교통망, 대학 혁신, 기업 유치 전략을 비교합니다.",
    hot: false,
    published: true,
    views: 66790,
    participants: 12054,
    commentsCount: 132,
    reactionCount: 341,
    newsLinks: [
      { id: "news-region-1", title: "지역 성장 거점 정책의 성과와 한계", outlet: "균형발전리포트", url: "https://example.com/news/region" }
    ],
    options: [
      option("regional-balance", "region-public", "공공기관 2차 이전", "중앙 공공기관과 연구기관을 추가 이전해 지역 일자리를 만든다.", "linear-gradient(135deg,#244868,#386a98,#e65b69)", 28, "분권 강화론과 가까운 입장", ["pol-choi"], "공공 부문이 먼저 지역 수요를 만든다는 관점입니다.", ["지역 고용을 빠르게 만들 수 있습니다.", "상징성이 큽니다."], ["기관만 옮기면 가족·기업 이전은 제한적일 수 있습니다.", "수도권 반발이 생길 수 있습니다."]),
      option("regional-balance", "region-transport", "광역 교통망 투자", "생활권을 넓히는 철도와 도로망에 우선 투자한다.", "linear-gradient(135deg,#255674,#2f7f8d,#df5465)", 31, "생활권 연결론과 가까운 입장", ["pol-kim"], "이동 시간을 줄여 지역 선택지를 늘립니다.", ["출퇴근·통학 가능 범위를 넓힙니다.", "기업 입지 매력을 높일 수 있습니다."], ["대규모 예산과 긴 시간이 필요합니다.", "수요 예측 실패 위험이 있습니다."]),
      option("regional-balance", "region-uni", "지역 대학 혁신", "지역 대학, 병원, 기업을 묶은 인재 생태계를 만든다.", "linear-gradient(135deg,#e4233f,#c94d5f,#244868)", 26, "교육·산업 클러스터론과 가까운 입장", ["pol-park"], "인재가 남을 이유를 만드는 데 초점을 둡니다.", ["청년 유출을 구조적으로 줄입니다.", "산업 전환과 연결하기 좋습니다."], ["성과가 느리게 나타납니다.", "대학 간 격차가 커질 수 있습니다."]),
      option("regional-balance", "region-tax", "기업 세제 혜택", "지역 이전 기업에 세제·규제 특례를 강하게 제공한다.", "linear-gradient(135deg,#4a5568,#31506a,#244868)", 15, "민간 투자 유치론과 가까운 입장", ["pol-lee"], "민간 일자리를 직접 끌어오려는 접근입니다.", ["기업 유치 효과가 빠를 수 있습니다.", "지역 세수 기반을 만들 수 있습니다."], ["혜택 종료 후 이탈 가능성이 있습니다.", "지역 간 유치 경쟁이 과열될 수 있습니다."])
    ],
    statistics: {
      "region-public": optionStats([24, 28, 36, 41], [47, 50, 3], [26, 39, 43, 48, 45], [23, 29, 35, 40]),
      "region-transport": optionStats([38, 41, 39, 34], [46, 51, 3], [35, 44, 36, 37, 47], [34, 39, 41, 37]),
      "region-uni": optionStats([43, 35, 30, 27], [53, 44, 3], [37, 32, 31, 35, 29], [41, 36, 29, 24]),
      "region-tax": optionStats([18, 23, 28, 32], [39, 58, 3], [21, 24, 30, 19, 25], [17, 22, 30, 35])
    },
    comments: commentsFor("regional-balance")
  }
];

export const sampleChatRooms: ChatRoom[] = politicians.map((politician, index) => ({
  id: `room-${politician.id}`,
  userId: "demo-user",
  politicianId: politician.id,
  lastMessage:
    index === 0
      ? "청년 주거 정책은 공급과 직접 지원을 같이 봐야 해요."
      : index === 1
        ? "개헌은 권력구조 설계가 핵심입니다."
        : index === 2
          ? "의료 정책 질문은 저녁에 자세히 답변드릴게요."
          : "지역 예산 우선순위를 시민 의견으로 정리 중입니다.",
  lastMessageAt: timeAgo(12 + index * 19),
  unreadCount: index === 0 ? 2 : 0
}));

export const sampleMessages: Record<string, ChatMessage[]> = Object.fromEntries(
  sampleChatRooms.map((room, index) => [
    room.id,
    [
      {
        id: `${room.id}-m1`,
        roomId: room.id,
        senderId: room.politicianId,
        body: index === 0 ? "안녕하세요. 오늘 청년 주거 질문 남겨주시면 우선순위별로 답드릴게요." : "안녕하세요. 의견 남겨주셔서 감사합니다.",
        createdAt: timeAgo(80 + index * 7),
        read: true
      },
      {
        id: `${room.id}-m2`,
        roomId: room.id,
        senderId: "demo-user",
        body: "정책 설명보다 실제로 제 삶에 어떤 변화가 생기는지 알고 싶어요.",
        createdAt: timeAgo(58 + index * 7),
        read: true
      },
      {
        id: `${room.id}-m3`,
        roomId: room.id,
        senderId: room.politicianId,
        body: room.lastMessage,
        createdAt: room.lastMessageAt,
        read: index !== 0
      }
    ]
  ])
);

export function getIssueById(id: string) {
  return issues.find((issue) => issue.id === id);
}

export function getHotIssue() {
  return issues.find((issue) => issue.hot) ?? issues[0];
}

export function getPoliticianById(id: string) {
  return politicians.find((politician) => politician.id === id);
}
