import { useState, useEffect, useCallback } from 'react';
import type { Email } from '../types';

type FetchFn = () => Promise<Email[]>;

export function useEmails(fetchFn: FetchFn, refreshKey: number = 0, intervalMs: number = 10000) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchFn();
      setEmails(data);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch emails';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    setIsLoading(true);
    load();
    const id = setInterval(load, intervalMs);
    return () => clearInterval(id);
  }, [load, intervalMs, refreshKey]);

  return { emails, isLoading, error, refetch: load };
}
