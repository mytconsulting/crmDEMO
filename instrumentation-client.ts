// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://0359685d855dc33f8c8de953431d70f7@o4511206682918912.ingest.de.sentry.io/4511206697205840",

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Supabase Auth uses Web Locks API for token refresh coordination across tabs.
  // When another tab steals the lock, the previous holder throws an AbortError — expected behavior, not a bug.
  ignoreErrors: [
    "Lock broken by another request with the 'steal' option",
    "Failed to execute 'selectNode' on 'Range'",
  ],
  denyUrls: [
    /_next-live\//,
  ],

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
  enableLogs: true,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
