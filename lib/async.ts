export const DEFAULT_REQUEST_TIMEOUT_MS = 12000;

export class RequestTimeoutError extends Error {
  constructor(label: string) {
    super(`${label} 요청 시간이 초과되었습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.`);
    this.name = "RequestTimeoutError";
  }
}

export function createTimeoutSignal(timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId)
  };
}

export async function withTimeout<T>(
  promise: Promise<T>,
  label = "데이터",
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new RequestTimeoutError(label)), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}
