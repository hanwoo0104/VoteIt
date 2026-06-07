import { NextResponse } from "next/server";
import { authError } from "@/app/api/_utils";
import { createPoliticianAccount, listPoliticians } from "@/services/sqlite/db";
import { requireCurrentUser } from "@/services/sqlite/session";
import { saveAvatarFile } from "@/services/uploads/avatarStorage";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireCurrentUser();
    if (user.role !== "admin") throw new Error("권한이 없습니다.");
    return NextResponse.json(listPoliticians());
  } catch (error) {
    return authError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentUser();
    const contentType = request.headers.get("content-type") ?? "";
    const body = contentType.includes("multipart/form-data") ? await readMultipartPolitician(request) : await request.json();
    return NextResponse.json(
      createPoliticianAccount(
        {
          name: String(body.name ?? ""),
          phone: String(body.phone ?? ""),
          password: String(body.password ?? ""),
          party: String(body.party ?? ""),
          roleTitle: String(body.roleTitle ?? ""),
          region: String(body.region ?? ""),
          avatarUrl: String(body.avatarUrl ?? ""),
          tags: Array.isArray(body.tags) ? body.tags.map(String) : String(body.tags ?? "").split(/[\n,]/)
        },
        user
      )
    );
  } catch (error) {
    return authError(error);
  }
}

async function readMultipartPolitician(request: Request) {
  const form = await request.formData();
  const file = form.get("avatar");
  return {
    name: String(form.get("name") ?? ""),
    phone: String(form.get("phone") ?? ""),
    password: String(form.get("password") ?? ""),
    party: String(form.get("party") ?? ""),
    roleTitle: String(form.get("roleTitle") ?? ""),
    region: String(form.get("region") ?? ""),
    avatarUrl: file instanceof File ? await saveAvatarFile(file, "politicians") : String(form.get("avatarUrl") ?? ""),
    tags: String(form.get("tags") ?? "").split(/[\n,]/)
  };
}
