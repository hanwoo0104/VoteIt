import { signOutResponse } from "@/services/sqlite/session";

export const runtime = "nodejs";

export async function POST() {
  return signOutResponse();
}

