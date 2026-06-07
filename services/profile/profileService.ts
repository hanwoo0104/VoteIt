import { apiFetch } from "@/services/api/http";
import type { UserProfile } from "@/types";

export async function uploadMyAvatar(avatarFile: File) {
  const form = new FormData();
  form.set("avatar", avatarFile);
  return apiFetch<UserProfile>("/api/profile/avatar", {
    method: "POST",
    body: form
  });
}
