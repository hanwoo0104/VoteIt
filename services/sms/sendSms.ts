export interface SendSmsPayload {
  to: string;
  message: string;
}

export interface SendSmsResult {
  provider: "console";
  messageId: string;
  accepted: boolean;
}

export async function sendSms(payload: SendSmsPayload): Promise<SendSmsResult> {
  const messageId = `console-${crypto.randomUUID()}`;

  console.log("[VoteIt SMS mock]", {
    messageId,
    to: payload.to,
    message: payload.message
  });

  return {
    provider: "console",
    messageId,
    accepted: true
  };
}
