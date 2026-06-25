/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { usePrivy, useLogin } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";

type AuthState = {
  ready: boolean;
  authenticated: boolean;
  address?: string;
  login: () => void;
  logout: () => void;
  getAccessToken: () => Promise<string | null>;
  demoMode: boolean;
  solBalance?: number;
  authError?: string | null;
  setAuthError: (err: string | null) => void;
};

const AuthContext = createContext<AuthState | null>(null);
const hasPrivy = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

function PrivyAuthBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, logout, user, getAccessToken } = usePrivy();
  const [authError, setAuthError] = useState<string | null>(null);

  // Filter out the Solana wallet explicitly
  const solanaAccount = user?.linkedAccounts.find(
    (account) => account.type === "wallet" && "address" in account && (account as any).chainType === "solana"
  );
  const address = solanaAccount && "address" in solanaAccount ? String(solanaAccount.address) : undefined;

  const { login } = useLogin({
    onComplete: () => {
      setAuthError(null);
    },
    onError: (error: any) => {
      const errMsg = typeof error === "string" ? error : String(error?.message ?? error ?? "");
      const lowerMsg = errMsg.toLowerCase();
      if (lowerMsg.includes("google") && lowerMsg.includes("not allowed")) {
        setAuthError(
          "Google login is disabled for this Privy application. Enable Google under User management → Authentication → Socials in the Privy dashboard.",
        );
      } else if (lowerMsg.includes("apple") && lowerMsg.includes("not allowed")) {
        setAuthError(
          "Apple login is disabled for this Privy application. Enable Apple under User management → Authentication → Socials in the Privy dashboard.",
        );
      } else if (lowerMsg.includes("cancel") || lowerMsg.includes("dismiss") || lowerMsg.includes("exit")) {
        setAuthError("Sign in was cancelled.");
      } else if (lowerMsg.includes("unsupport") || lowerMsg.includes("browser")) {
        setAuthError("Your browser is not supported for in-app authentication. Please switch to a standard browser.");
      } else if (lowerMsg.includes("expire")) {
        setAuthError("Session has expired. Please sign in again.");
      } else {
        setAuthError("Authentication failed: " + errMsg);
      }
    }
  });

  // Verify that a Solana wallet exists after logging in
  useEffect(() => {
    if (ready && authenticated) {
      const solanaWallet = user?.linkedAccounts.find(
        (account) => account.type === "wallet" && (account as any).chainType === "solana"
      );
      if (!solanaWallet) {
        setAuthError("No Solana wallet found. Please link or create a Solana wallet.");
      }
    }
  }, [ready, authenticated, user]);

  // Query SOL balance
  const { data: solBalance } = useQuery({
    queryKey: ["position", address, "So11111111111111111111111111111111111111112"],
    enabled: authenticated && Boolean(address),
    queryFn: async () => {
      try {
        const response = await fetch(`/api/token/So11111111111111111111111111111111111111112/position?address=${address}`)
        if (!response.ok) return 0
        const res = await response.json()
        return res?.data?.position?.balance ?? 0
      } catch {
        return 0
      }
    },
    refetchInterval: 10000,
  });

  const value = useMemo<AuthState>(
    () => ({
      ready,
      authenticated,
      login,
      logout,
      getAccessToken,
      address,
      demoMode: false,
      solBalance,
      authError,
      setAuthError,
    }),
    [address, authenticated, getAccessToken, login, logout, ready, solBalance, authError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function DemoAuthBridge({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const value = useMemo<AuthState>(
    () => ({
      ready: true,
      authenticated,
      login: () => {
        setAuthError(null);
        setAuthenticated(true);
      },
      logout: () => {
        setAuthError(null);
        setAuthenticated(false);
      },
      getAccessToken: async () => null,
      address: authenticated
        ? "11111111111111111111111111111111"
        : undefined,
      demoMode: true,
      solBalance: authenticated ? 12.345 : 0,
      authError,
      setAuthError,
    }),
    [authenticated, authError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthContextProvider({ children }: { children: ReactNode }) {
  return hasPrivy ? (
    <PrivyAuthBridge>{children}</PrivyAuthBridge>
  ) : (
    <DemoAuthBridge>{children}</DemoAuthBridge>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthContextProvider");
  return context;
}
