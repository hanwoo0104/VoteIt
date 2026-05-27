export interface RequestOtpResult {
  verificationId: string;
  expiresAt: string;
  devCode?: string;
}

export interface VerifyOtpResult {
  verificationId: string;
  verified: true;
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? "요청 처리에 실패했습니다.");
  }
  return body as T;
}

export async function requestSignupOtp(phone: string): Promise<RequestOtpResult> {
  const response = await fetch("/api/auth/otp/request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ phone, purpose: "signup" })
  });

  return parseJson<RequestOtpResult>(response);
}

export async function verifySignupOtp(verificationId: string, code: string): Promise<VerifyOtpResult> {
  const response = await fetch("/api/auth/otp/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ verificationId, code })
  });

  return parseJson<VerifyOtpResult>(response);
}
