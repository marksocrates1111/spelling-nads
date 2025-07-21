'use client';

import { ReactTogether } from 'react-together';

// IMPORTANT: Replace with your actual Multisynq API Key and a unique App ID for this project.
const MULTISYNQ_API_KEY = "2KMXEZnHvrJMk8lGLVSaRIDist5TWLSIShlR0EL8iu";
const APP_ID = "xyz.marksocratests.spellingnads.nextjs.v1";

export function MultiplayerProvider({ children }: { children: React.ReactNode }) {
  return (
    <ReactTogether
      sessionParams={{
        apiKey: MULTISYNQ_API_KEY,
        appId: APP_ID,
      }}
      rememberUsers={true} // Persists user ID and nickname in localStorage
    >
      {children}
    </ReactTogether>
  );
}