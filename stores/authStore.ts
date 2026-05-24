"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { loginWithAuth, signOutWithAuth, signUpWithAuth, type LoginPayload, type SignUpPayload } from "@/services/auth/authService";
import type { UserProfile } from "@/types";

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignUpPayload) => Promise<void>;
  logout: () => Promise<void>;
  setDemoRole: (role: UserProfile["role"]) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      loading: false,
      error: null,
      async login(payload) {
        set({ loading: true, error: null });
        try {
          const result = await loginWithAuth(payload);
          set({ user: result.user, accessToken: result.accessToken, loading: false });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "로그인에 실패했어요.", loading: false });
          throw error;
        }
      },
      async signup(payload) {
        set({ loading: true, error: null });
        try {
          const result = await signUpWithAuth(payload);
          set({ user: result.user, accessToken: result.accessToken, loading: false });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : "회원가입에 실패했어요.", loading: false });
          throw error;
        }
      },
      async logout() {
        await signOutWithAuth();
        set({ user: null, accessToken: null, error: null });
      },
      setDemoRole(role) {
        const current = get().user;
        set({
          user: current
            ? { ...current, role }
            : {
                id: `demo-${role}`,
                name: role === "admin" ? "관리자" : role === "politician" ? "정치인" : "시민",
                nickname: role === "admin" ? "보팃운영" : role === "politician" ? "정책답변자" : "시민데모",
                phone: role === "admin" ? "010-0000-0000" : "010-1234-5678",
                role,
                gender: "other",
                ageGroup: "30대",
                region: "서울",
                incomeLevel: "200-400만원",
                createdAt: new Date().toISOString()
              },
          accessToken: `local-session-demo-${role}`
        });
      }
    }),
    {
      name: "voteit-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken
      })
    }
  )
);
