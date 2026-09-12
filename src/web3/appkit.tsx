import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { avalancheFuji, mainnet } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { WagmiProvider } from "wagmi";

export const reownProjectId = (import.meta.env.VITE_REOWN_PROJECT_ID ?? "").trim();
export const reownConfigured = reownProjectId.length > 0;

const networks = [mainnet, avalancheFuji] as const;
const queryClient = new QueryClient();
export const wagmiAdapter = reownConfigured
  ? new WagmiAdapter({ networks: [...networks], projectId: reownProjectId })
  : null;
export const wagmiConfig = wagmiAdapter?.wagmiConfig ?? null;

if (wagmiAdapter) {
  createAppKit({
    adapters: [wagmiAdapter],
    networks: [...networks],
    projectId: reownProjectId,
    metadata: {
      name: "Vector52",
      description: "Evidence-first blockchain forensic investigations",
      url: window.location.origin,
      icons: [`${window.location.origin}/icons/icon-192.svg`]
    },
    features: {
      analytics: false,
      email: false,
      socials: false
    },
    themeMode: "light"
  });
}

export function Web3Provider({ children }: { children: ReactNode }) {
  if (!wagmiAdapter) return children;
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
