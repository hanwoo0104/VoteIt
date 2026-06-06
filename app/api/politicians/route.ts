import { NextResponse } from "next/server";
import { jsonError } from "@/app/api/_utils";
import { listPoliticians } from "@/services/sqlite/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(listPoliticians());
  } catch (error) {
    return jsonError(error);
  }
}

