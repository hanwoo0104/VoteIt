import { NextResponse } from "next/server";

export function jsonError(error: unknown, status = 500) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "요청 처리에 실패했습니다." },
    { status }
  );
}

export function authError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return jsonError(error, message.includes("로그인") ? 401 : 500);
}
