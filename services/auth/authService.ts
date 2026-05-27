import { getSupabaseClient, supabase } from "@/services/supabase/client";
import { runSupabaseQuery } from "@/services/supabase/query";
import { phoneToAuthEmail, normalizePhone } from "@/services/auth/phone";
import { withTimeout } from "@/lib/async";
import type { Demographics, UserProfile } from "@/types";

export interface SignUpPayload extends Demographics {
  name: string;
  nickname: string;
  phone: string;
  password: string;
  verificationId: string;
}

export interface LoginPayload {
  phone: string;
  password: string;
}

export interface AuthResult {
  user: UserProfile;
  accessToken: string;
}

interface UserRow {
  id: string;
  phone: string;
  role: UserProfile["role"];
  created_at: string;
}

interface ProfileRow {
  id: string;
  name: string;
  nickname: string;
  gender: UserProfile["gender"];
  age_group: UserProfile["ageGroup"];
  region: string;
  income_level: UserProfile["incomeLevel"];
  avatar_url?: string | null;
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? "요청 처리에 실패했습니다.");
  }
  return body as T;
}

export async function fetchProfile(userId: string): Promise<UserProfile> {
  const client = getSupabaseClient();
  const [{ data: userRow, error: userError }, { data: profileRow, error: profileError }] = await Promise.all([
    runSupabaseQuery(client.from("users").select("id, phone, role, created_at").eq("id", userId).single<UserRow>(), "사용자"),
    runSupabaseQuery(
      client
        .from("profiles")
        .select("id, name, nickname, gender, age_group, region, income_level, avatar_url")
        .eq("id", userId)
        .single<ProfileRow>(),
      "프로필"
    )
  ]);

  if (userError) throw new Error(userError.message);
  if (profileError) throw new Error(profileError.message);
  if (!userRow || !profileRow) throw new Error("사용자 프로필을 찾을 수 없습니다.");

  return {
    id: userRow.id,
    name: profileRow.name,
    nickname: profileRow.nickname,
    phone: userRow.phone,
    role: userRow.role,
    gender: profileRow.gender,
    ageGroup: profileRow.age_group,
    region: profileRow.region,
    incomeLevel: profileRow.income_level,
    avatarUrl: profileRow.avatar_url ?? undefined,
    createdAt: userRow.created_at
  };
}

export async function signUpWithAuth(payload: SignUpPayload): Promise<AuthResult> {
  await parseJson<{ userId: string }>(
    await withTimeout(
      fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...payload,
          phone: normalizePhone(payload.phone)
        })
      }),
      "회원가입"
    )
  );

  return loginWithAuth({
    phone: payload.phone,
    password: payload.password
  });
}

export async function loginWithAuth(payload: LoginPayload): Promise<AuthResult> {
  const client = getSupabaseClient();
  const { data, error } = await withTimeout(
    client.auth.signInWithPassword({
      email: phoneToAuthEmail(payload.phone),
      password: payload.password
    }),
    "로그인"
  );

  if (error) throw new Error(error.message);
  if (!data.user || !data.session) throw new Error("세션을 만들지 못했습니다.");

  return {
    user: await fetchProfile(data.user.id),
    accessToken: data.session.access_token
  };
}

export async function loadCurrentAuth(): Promise<AuthResult | null> {
  if (!supabase) return null;

  const { data, error } = await withTimeout(supabase.auth.getSession(), "세션 확인");
  if (error) throw new Error(error.message);
  if (!data.session?.user) return null;

  return {
    user: await fetchProfile(data.session.user.id),
    accessToken: data.session.access_token
  };
}

export async function signOutWithAuth() {
  const client = getSupabaseClient();
  await client.auth.signOut();
}
