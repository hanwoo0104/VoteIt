import { NextResponse } from "next/server";
import { authError } from "@/app/api/_utils";
import { updateProfileAvatar } from "@/services/sqlite/db";
import { requireCurrentUser } from "@/services/sqlite/session";
import { saveAvatarFile } from "@/services/uploads/avatarStorage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const form = await request.formData();
    const file = form.get("avatar");
    if (!(file instanceof File)) throw new Error("업로드할 사진을 선택해 주세요.");
    const avatarUrl = await saveAvatarFile(file, "profiles");
    return NextResponse.json(updateProfileAvatar(user.id, avatarUrl));
  } catch (error) {
    return authError(error);
  }
}
