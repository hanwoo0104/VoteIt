import { NextResponse } from "next/server";
import { jsonError } from "@/app/api/_utils";
import { getIssueBySlug } from "@/services/sqlite/db";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return NextResponse.json(getIssueBySlug(id));
  } catch (error) {
    return jsonError(error, 404);
  }
}
