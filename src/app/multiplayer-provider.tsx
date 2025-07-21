'use client';

import { ReactNode } from 'react';
import { ReactTogether } from 'react-together';

// IMPORTANT: Your Multisynq API Key and App ID
const MULTISYNQ_API_KEY = "2KMXEZnHvrJMk8lGLVSaRIDist5TWLSIShlR0EL8iu";
const APP_ID = "xyz.marksocratests.spellingnads.nextjs.v1";

export function MultiplayerProvider({ children }: { children: ReactNode }) {
  // This component simply wraps its children with the ReactTogether provider.
  // The logic to prevent server-side execution will now live in the page component itself.
  return (
    <ReactTogether
      sessionParams={{
        apiKey: MULTISYNQ_API_KEY,
        appId: APP_ID,
      }}
      rememberUsers={true}
    >
      {children}
    </ReactTogether>
  );
}
