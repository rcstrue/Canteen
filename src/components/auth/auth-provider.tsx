"use client";

import {
  SessionProvider,
  useSession,
  signIn,
  signOut,
} from "next-auth/react";
import { createContext, useContext, type ReactNode } from "react";

interface AuthContextType {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthInner({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";
  const user = session?.user ?? null;

  const login = async (email: string, password: string) => {
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        return { ok: false, error: result.error };
      }

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Login failed",
      };
    }
  };

  const logout = async () => {
    await signOut({ redirect: false });
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthInner>{children}</AuthInner>
    </SessionProvider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
