'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import the main multiplayer UI with SSR completely turned off.
// This is the canonical way to ensure client-side libraries that use 'window'
// do not break the server build.
const MultiplayerUI = dynamic(
  () => import('./multiplayer-ui'), 
  { 
    // Ensure this component only renders on the client side.
    ssr: false,
    
    // Display a loading component while the main UI is being loaded.
    loading: () => (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
        <div className="text-3xl font-bold animate-pulse text-shadow">Loading Multiplayer...</div>
      </div>
    )
  }
);

// The page component now safely renders the dynamically imported client component.
export default function MultiplayerPage() {
  return <MultiplayerUI />;
}
