import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { createSession, deleteSession, getUserBySessionToken } from "@/services/sqlite/db";
import type { UserProfile } from "@/types";

export const SESSION_COOKIE = "voteit_session";

export async function currentUser(): Promise<UserProfile | null> {
  const cookieStore = await cookies();
  return getUserBySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requireCurrentUser() {
  const user = await currentUser();
  if (!user) throw new Error("로그인이 필요합니다.");
  return user;
}

async function shouldUseSecureCookie() {
  if (process.env.VOTEIT_SECURE_COOKIES === "true") return true;
  if (process.env.VOTEIT_SECURE_COOKIES === "false") return false;
  if (process.env.VERCEL === "1") return true;

  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  return forwardedProto === "https";
}

export async function signInResponse(userId: string, body: Record<string, unknown>) {
  const session = createSession(userId);
  const response = NextResponse.json(body);
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await shouldUseSecureCookie(),
    path: "/",
    expires: new Date(session.expiresAt)
  });
  return response;
}

export async function signOutResponse() {
  const cookieStore = await cookies();
  deleteSession(cookieStore.get(SESSION_COOKIE)?.value);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: await shouldUseSecureCookie(),
    path: "/",
    maxAge: 0
  });
  return response;
}
