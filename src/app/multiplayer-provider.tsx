'use client';

import { useState, useEffect, ReactNode } from 'react';
import { ReactTogether } from 'react-together';

// IMPORTANT: Replace with your actual Multisynq API Key and a unique App ID for this project.
const MULTISYNQ_API_KEY = "2KMXEZnHvrJMk8lGLVSaRIDist5TWLSIShlR0EL8iu";
const APP_ID = "xyz.marksocratests.spellingnads.nextjs.v1";

export function MultiplayerProvider({ children }: { children: ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  // This effect runs only on the client, after the component has mounted.
  useEffect(() => {
    setIsClient(true);
  }, []);

  // On the server-side render or before the client has mounted,
  // we render the children directly. This avoids the "window is not defined" error
  // because ReactTogether is not rendered.
  if (!isClient) {
    return <>{children}</>;
  }

  // Once we're on the client, we can safely render the provider.
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
