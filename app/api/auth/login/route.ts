import { jsonError } from "@/app/api/_utils";
import { loginWithPassword } from "@/services/sqlite/db";
import { signInResponse } from "@/services/sqlite/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = loginWithPassword(String(body.phone ?? ""), String(body.password ?? ""));
    return signInResponse(user.id, {
      user,
      accessToken: "local-session"
    });
  } catch (error) {
    return jsonError(error, 401);
  }
}
