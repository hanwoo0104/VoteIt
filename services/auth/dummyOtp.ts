export const DEMO_OTP_CODE = "123456";

export async function requestDummyOtp(phone: string) {
  await new Promise((resolve) => setTimeout(resolve, 450));
  return {
    phone,
    expiresInSeconds: 180,
    devCode: DEMO_OTP_CODE
  };
}

export async function verifyDummyOtp(code: string) {
  await new Promise((resolve) => setTimeout(resolve, 350));
  return code.trim() === DEMO_OTP_CODE;
}
