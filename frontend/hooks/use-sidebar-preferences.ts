"use client";

import { useCallback, useEffect, useState } from "react";

export function useStoredStringList(key: string, limit?: number) {
  const [value, setValue] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (Array.isArray(stored) && stored.every((item) => typeof item === "string")) setValue(stored);
    } catch {
      localStorage.removeItem(key);
    }
  }, [key]);

  const update = useCallback((next: string[] | ((previous: string[]) => string[])) => {
    setValue((previous) => {
      const resolved = typeof next === "function" ? next(previous) : next;
      const normalized = [...new Set(resolved)].slice(0, limit);
      if (normalized.length === previous.length && normalized.every((item, index) => item === previous[index])) {
        return previous;
      }
      localStorage.setItem(key, JSON.stringify(normalized));
      return normalized;
    });
  }, [key, limit]);

  const toggle = useCallback((item: string) => update((previous) => (
    previous.includes(item) ? previous.filter((value) => value !== item) : [item, ...previous]
  )), [update]);

  return { value, update, toggle };
}
