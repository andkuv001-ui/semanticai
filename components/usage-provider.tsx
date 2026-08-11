"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { Usage } from "@/lib/models";

interface UsageContextValue {
  usage: Usage;
  dbAvailable: boolean;
  increment: (deltaTokens: number) => Promise<void>;
  updateLimit: (limit: number) => Promise<void>;
}

const UsageContext = createContext<UsageContextValue | null>(null);

export function useUsage(): UsageContextValue {
  const ctx = useContext(UsageContext);
  if (!ctx) {
    throw new Error("useUsage должен использоваться внутри UsageProvider");
  }
  return ctx;
}

interface UsageProviderProps {
  initialUsage: Usage;
  dbAvailable: boolean;
  children: ReactNode;
}

export function UsageProvider({
  initialUsage,
  dbAvailable,
  children,
}: UsageProviderProps) {
  const [usage, setUsage] = useState<Usage>(initialUsage);
  const usageRef = useRef(usage);

  useEffect(() => {
    usageRef.current = usage;
  }, [usage]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/usage")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Usage | null) => {
        if (data && !cancelled) {
          setUsage(data);
        }
      })
      .catch(() => {
        // Оставляем данные, переданные с сервера
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(
    async (next: Usage): Promise<Usage> => {
      if (!dbAvailable) {
        setUsage(next);
        toast.warning("Счётчик не сохранится между сессиями (БД недоступна)");
        return next;
      }

      try {
        const response = await fetch("/api/usage", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generationCount: next.generationCount,
            tokenCount: next.tokenCount,
            limit: next.limit,
          }),
        });

        if (response.ok) {
          const saved: Usage = await response.json();
          setUsage(saved);
          return saved;
        }

        const error = await response.json();
        toast.warning(error.error || "Счётчик не обновлён");
      } catch {
        toast.warning("Счётчик не обновлён");
      }

      return next;
    },
    [dbAvailable]
  );

  const increment = useCallback(
    async (deltaTokens: number) => {
      const prev = usageRef.current;
      const next: Usage = {
        ...prev,
        generationCount: prev.generationCount + 1,
        tokenCount: prev.tokenCount + deltaTokens,
      };

      setUsage(next);
      usageRef.current = next;

      const reachedLimit =
        prev.generationCount < prev.limit && next.generationCount >= prev.limit;

      await persist(next);

      if (reachedLimit) {
        toast(
          `Достигнут лимит счётчика: ${next.generationCount} из ${next.limit} генераций`,
          {
            action: { label: "Понятно", onClick: () => {} },
          }
        );
      }
    },
    [persist]
  );

  const updateLimit = useCallback(
    async (limit: number) => {
      const prev = usageRef.current;
      const next: Usage = { ...prev, limit };

      setUsage(next);
      usageRef.current = next;

      await persist(next);
    },
    [persist]
  );

  return (
    <UsageContext.Provider
      value={{ usage, dbAvailable, increment, updateLimit }}
    >
      {children}
    </UsageContext.Provider>
  );
}
