import { apiFetch } from "@/services/api/http";
import { normalizePhone } from "@/services/auth/phone";
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

export async function fetchProfile(): Promise<UserProfile> {
  const result = await loadCurrentAuth();
  if (!result?.user) throw new Error("로그인이 필요합니다.");
  return result.user;
}

export async function signUpWithAuth(payload: SignUpPayload): Promise<AuthResult> {
  await apiFetch<{ userId: string }>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      phone: normalizePhone(payload.phone)
    })
  });

  return loginWithAuth({
    phone: payload.phone,
    password: payload.password
  });
}

export async function loginWithAuth(payload: LoginPayload): Promise<AuthResult> {
  return apiFetch<AuthResult>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      phone: normalizePhone(payload.phone),
      password: payload.password
    })
  });
}

export async function loadCurrentAuth(): Promise<AuthResult | null> {
  const result = await apiFetch<{ user: UserProfile | null; accessToken: string | null }>("/api/auth/me", {
    method: "GET"
  });
  return result.user && result.accessToken ? { user: result.user, accessToken: result.accessToken } : null;
}

export async function signOutWithAuth() {
  await apiFetch<{ ok: true }>("/api/auth/logout", { method: "POST" });
}

