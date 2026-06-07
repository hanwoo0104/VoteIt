import { NextResponse } from "next/server";
import { authError } from "@/app/api/_utils";
import { updatePoliticianAvatar } from "@/services/sqlite/db";
import { requireCurrentUser } from "@/services/sqlite/session";
import { saveAvatarFile } from "@/services/uploads/avatarStorage";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireCurrentUser();
    const { id } = await context.params;
    const form = await request.formData();
    const file = form.get("avatar");
    if (!(file instanceof File)) throw new Error("업로드할 사진을 선택해 주세요.");
    const avatarUrl = await saveAvatarFile(file, "politicians");
    return NextResponse.json(updatePoliticianAvatar(id, avatarUrl, user));
  } catch (error) {
    return authError(error);
  }
}
