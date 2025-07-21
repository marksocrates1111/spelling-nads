// src/app/providers.tsx
'use client';

import { ReactNode } from 'react';
import { MultiplayerProvider } from './multiplayer-provider';

/**
 * This Client Component acts as a wrapper for all client-side context providers.
 * It's used by the multiplayer layout to safely inject client-side logic.
 */
export default function Providers({ children }: { children: ReactNode }) {
  return <MultiplayerProvider>{children}</MultiplayerProvider>;
}
