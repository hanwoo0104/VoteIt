export type UserRole = "user" | "politician" | "admin";
export type Gender = "female" | "male" | "other";
export type AgeGroup = "10대" | "20대" | "30대" | "40대" | "50대" | "60대 이상";
export type IncomeLevel = "200만원 미만" | "200-400만원" | "400-700만원" | "700만원 이상";

export interface Demographics {
  gender: Gender;
  ageGroup: AgeGroup;
  region: string;
  incomeLevel: IncomeLevel;
}

export interface UserProfile extends Demographics {
  id: string;
  name: string;
  nickname: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface NewsLink {
  id: string;
  title: string;
  outlet: string;
  url: string;
}

export interface Politician {
  id: string;
  name: string;
  party: string;
  role: string;
  region: string;
  avatarUrl: string;
  online: boolean;
  status: string;
  tags: string[];
}

export interface IssueOption {
  id: string;
  issueId: string;
  title: string;
  shortText: string;
  gradient: string;
  partyAlignment: string;
  politicianIds: string[];
  difference: string;
  pros: string[];
  cons: string[];
  percent: number;
}

export interface BreakdownPoint {
  label: string;
  value: number;
}

export interface IssueStatistics {
  age: BreakdownPoint[];
  gender: BreakdownPoint[];
  region: BreakdownPoint[];
  income: BreakdownPoint[];
}

export interface CommentAuthor {
  id: string;
  nickname: string;
  role?: UserRole;
  avatarUrl?: string;
}

export interface Comment {
  id: string;
  issueId: string;
  parentId?: string;
  author: CommentAuthor;
  body: string;
  likes: number;
  likedByMe?: boolean;
  reported?: boolean;
  createdAt: string;
  replies: Comment[];
}

export interface Issue {
  id: string;
  title: string;
  summary: string;
  description: string;
  hot: boolean;
  published: boolean;
  views: number;
  participants: number;
  commentsCount: number;
  reactionCount: number;
  newsLinks: NewsLink[];
  options: IssueOption[];
  statistics: Record<string, IssueStatistics>;
  comments: Comment[];
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface ChatRoom {
  id: string;
  userId: string;
  politicianId: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface AIAnalysis {
  optionId: string;
  alignment: string;
  difference: string;
  pros: string[];
  cons: string[];
  politicianNotes: string[];
  closing: string;
}
