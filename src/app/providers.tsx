'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia } from 'wagmi/chains';

// Dynamically import the MultiplayerProvider with SSR turned off.
// This is the key to fixing the "window is not defined" error, as it ensures
// the client-side `react-together` library is never loaded on the server.
const MultiplayerProvider = dynamic(
  () => import('./multiplayer-provider').then(mod => mod.MultiplayerProvider),
  { ssr: false }
);

// 1. Create the wagmi config
const config = getDefaultConfig({
  appName: 'Spelling Nads',
  projectId: 'b62cf109f5648e26d8e54c97a25d1e0a', // Using a public placeholder ID
  chains: [mainnet, sepolia],
  ssr: true,
});

// 2. Create a TanStack Query client
const queryClient = new QueryClient();

// 3. Create the master AppProviders component
export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {/* By dynamically importing, this provider will only render on the client */}
          <MultiplayerProvider>
            {children}
          </MultiplayerProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
