"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppUser } from "@/types";

const STORAGE_KEY = "debateme_user";

export function useLocalUser() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const createUser = useCallback(async (name: string) => {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to create user");
    }
    const created: AppUser = await res.json();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(created));
    setUser(created);
    return created;
  }, []);

  return { user, loading, createUser };
}
