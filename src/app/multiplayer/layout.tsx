'use client'; // The layout must be a client component to use dynamic imports

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import the Providers component with SSR completely turned off.
// This ensures the entire provider chain (Providers -> MultiplayerProvider -> ReactTogether)
// is never rendered on the server.
const Providers = dynamic(() => import('../providers'), {
  ssr: false,
  // Display a loading state while the client-side providers are loading.
  loading: () => (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <div className="text-3xl font-bold animate-pulse text-shadow">
        Initializing Session...
      </div>
    </div>
  ),
});

export default function MultiplayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout now safely wraps the multiplayer pages with our
  // dynamically-loaded, client-side-only providers.
  return <Providers>{children}</Providers>;
}
