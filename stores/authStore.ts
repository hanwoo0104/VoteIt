"use client";

import { create } from "zustand";
import {
  loadCurrentAuth,
  loginWithAuth,
  signOutWithAuth,
  signUpWithAuth,
  type LoginPayload,
  type SignUpPayload
} from "@/services/auth/authService";
import type { UserProfile } from "@/types";

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  initialized: boolean;
  loading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignUpPayload) => Promise<void>;
  logout: () => Promise<void>;
  setAuth: (user: UserProfile | null, accessToken: string | null) => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  accessToken: null,
  initialized: false,
  loading: false,
  error: null,
  async initialize() {
    if (get().initialized || get().loading) return;
    set({ loading: true, error: null });
    try {
      const result = await loadCurrentAuth();
      set({
        user: result?.user ?? null,
        accessToken: result?.accessToken ?? null,
        initialized: true,
        loading: false
      });
    } catch (error) {
      set({
        initialized: true,
        loading: false,
        error: error instanceof Error ? error.message : "세션 확인에 실패했습니다."
      });
    }
  },
  async login(payload) {
    set({ loading: true, error: null });
    try {
      const result = await loginWithAuth(payload);
      set({ user: result.user, accessToken: result.accessToken, initialized: true, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "로그인에 실패했어요.", loading: false });
      throw error;
    }
  },
  async signup(payload) {
    set({ loading: true, error: null });
    try {
      const result = await signUpWithAuth(payload);
      set({ user: result.user, accessToken: result.accessToken, initialized: true, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "회원가입에 실패했어요.", loading: false });
      throw error;
    }
  },
  async logout() {
    set({ loading: true, error: null });
    try {
      await signOutWithAuth();
      set({ user: null, accessToken: null, initialized: true, loading: false });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : "로그아웃에 실패했습니다." });
    }
  },
  setAuth(user, accessToken) {
    set({ user, accessToken, initialized: true, loading: false, error: null });
  }
}));
