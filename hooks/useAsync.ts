"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { withTimeout } from "@/lib/async";

interface UseAsyncOptions {
  label?: string;
  timeoutMs?: number;
}

interface ReloadOptions {
  silent?: boolean;
}

export function useAsync<T>(loader: () => Promise<T>, deps: React.DependencyList = [], options: UseAsyncOptions = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(false);

  const reload = useCallback(async (reloadOptions: ReloadOptions = {}) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    if (!reloadOptions.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const result = await withTimeout(Promise.resolve().then(loader), options.label ?? "데이터", options.timeoutMs);
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setData(result);
    } catch (caught) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setError(caught instanceof Error ? caught.message : "데이터를 불러오지 못했습니다.");
    } finally {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload, setData };
}
