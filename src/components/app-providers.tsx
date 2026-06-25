"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { useState, type ReactNode } from "react";
import { AuthContextProvider } from "@/components/auth-context";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  const content = (
    <QueryProvider>
      <AuthContextProvider>{children}</AuthContextProvider>
    </QueryProvider>
  );

  if (!privyAppId) return content;

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ["google", "apple"],
        appearance: {
          theme: "dark",
          accentColor: "#20E982",
          logo: "/brand/logo-dark.png",
          walletChainType: "solana-only",
        },
        embeddedWallets: {
          solana: { createOnLogin: "users-without-wallets" },
        },
        externalWallets: {
          solana: { connectors: toSolanaWalletConnectors() },
        },
      }}
    >
      {content}
    </PrivyProvider>
  );
}
