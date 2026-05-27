import { createTimeoutSignal, isAbortError, withTimeout } from "@/lib/async";

type SupabaseQuery<T> = PromiseLike<T> & {
  abortSignal?: (signal: AbortSignal) => PromiseLike<T>;
};

export async function runSupabaseQuery<T>(query: SupabaseQuery<T>, label: string): Promise<T> {
  if (typeof query.abortSignal !== "function") {
    return withTimeout(Promise.resolve(query), label);
  }

  const timeout = createTimeoutSignal();

  try {
    return await query.abortSignal(timeout.signal);
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(`${label} 요청 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.`);
    }
    throw error;
  } finally {
    timeout.clear();
  }
}
