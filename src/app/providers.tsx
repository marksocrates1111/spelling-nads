// src/app/providers.tsx
'use client';

import { ReactNode } from 'react';
import { MultiplayerProvider } from './multiplayer-provider';

/**
 * This is a Client Component that acts as a wrapper for all client-side context providers.
 * By isolating the providers here, we can safely use them in our Server Component layout
 * without breaking Server-Side Rendering (SSR).
 */
export default function Providers({ children }: { children: ReactNode }) {
  return <MultiplayerProvider>{children}</MultiplayerProvider>;
}
