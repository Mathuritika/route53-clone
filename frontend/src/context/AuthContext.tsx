"use client";
// Holds the logged-in user. The session token lives in localStorage, so a page refresh keeps you signed in.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi, TOKEN_KEY } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  // On first load: if we have a token, ask the backend who we are
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      setLoading(false);
      return;
    }
    authApi.me().then(setUser).catch(clearSession).finally(() => setLoading(false));
  }, [clearSession]);

  // api.ts fires this event when any request returns 401
  useEffect(() => {
    window.addEventListener("r53:unauthorized", clearSession);
    return () => window.removeEventListener("r53:unauthorized", clearSession);
  }, [clearSession]);

  const login = async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    localStorage.setItem(TOKEN_KEY, res.token);
    setUser(res.user);
  };

  const logout = async () => {
    await authApi.logout().catch(() => undefined);
    clearSession();
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
