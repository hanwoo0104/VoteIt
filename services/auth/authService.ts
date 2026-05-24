import { supabase, isSupabaseConfigured } from "@/services/supabase/client";
import type { Demographics, UserProfile, UserRole } from "@/types";

export interface SignUpPayload extends Demographics {
  name: string;
  nickname: string;
  phone: string;
  password: string;
}

export interface LoginPayload {
  phone: string;
  password: string;
}

export interface AuthResult {
  user: UserProfile;
  accessToken: string;
}

const demoProfiles: Array<UserProfile & { password: string }> = [
  {
    id: "demo-user",
    name: "해커톤",
    nickname: "시민데모",
    phone: "010-1234-5678",
    password: "voteit1234!",
    role: "user",
    gender: "other",
    ageGroup: "30대",
    region: "서울",
    incomeLevel: "200-400만원",
    createdAt: new Date().toISOString()
  },
  {
    id: "demo-admin",
    name: "관리자",
    nickname: "보팃운영",
    phone: "010-0000-0000",
    password: "admin1234!",
    role: "admin",
    gender: "other",
    ageGroup: "30대",
    region: "서울",
    incomeLevel: "400-700만원",
    createdAt: new Date().toISOString()
  },
  {
    id: "demo-politician",
    name: "정치인",
    nickname: "정책답변자",
    phone: "010-9999-9999",
    password: "pol1234!",
    role: "politician",
    gender: "other",
    ageGroup: "40대",
    region: "대전",
    incomeLevel: "700만원 이상",
    createdAt: new Date().toISOString()
  }
];

function toProfile(payload: SignUpPayload, role: UserRole = "user"): UserProfile {
  return {
    id: `local-${crypto.randomUUID()}`,
    name: payload.name,
    nickname: payload.nickname,
    phone: payload.phone,
    role,
    gender: payload.gender,
    ageGroup: payload.ageGroup,
    region: payload.region,
    incomeLevel: payload.incomeLevel,
    createdAt: new Date().toISOString()
  };
}

export async function signUpWithAuth(payload: SignUpPayload): Promise<AuthResult> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signUp({
      phone: payload.phone,
      password: payload.password,
      options: {
        data: {
          name: payload.name,
          nickname: payload.nickname,
          role: "user",
          gender: payload.gender,
          age_group: payload.ageGroup,
          region: payload.region,
          income_level: payload.incomeLevel
        }
      }
    });

    if (error) throw new Error(error.message);

    const user = toProfile(payload);
    user.id = data.user?.id ?? user.id;
    return {
      user,
      accessToken: data.session?.access_token ?? `supabase-pending-${user.id}`
    };
  }

  const user = toProfile(payload);
  return {
    user,
    accessToken: `local-session-${user.id}`
  };
}

export async function loginWithAuth(payload: LoginPayload): Promise<AuthResult> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      phone: payload.phone,
      password: payload.password
    });

    if (error) throw new Error(error.message);

    const metadata = data.user.user_metadata;
    return {
      user: {
        id: data.user.id,
        name: metadata.name ?? "VoteIt 사용자",
        nickname: metadata.nickname ?? "시민",
        phone: payload.phone,
        role: metadata.role ?? "user",
        gender: metadata.gender ?? "other",
        ageGroup: metadata.age_group ?? "30대",
        region: metadata.region ?? "서울",
        incomeLevel: metadata.income_level ?? "200-400만원",
        createdAt: data.user.created_at
      },
      accessToken: data.session?.access_token ?? ""
    };
  }

  await new Promise((resolve) => setTimeout(resolve, 350));
  const match = demoProfiles.find((profile) => profile.phone === payload.phone && profile.password === payload.password);
  if (!match) {
    throw new Error("휴대폰 번호 또는 비밀번호를 확인해 주세요.");
  }
  const { password: _password, ...user } = match;
  return {
    user,
    accessToken: `local-session-${match.id}`
  };
}

export async function signOutWithAuth() {
  if (isSupabaseConfigured && supabase) {
    await supabase.auth.signOut();
  }
}
