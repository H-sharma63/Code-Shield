import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: 'https://bc972bf663cdb1b3454f87c0df336b6e@o4509974132031488.ingest.us.sentry.io/4509974133866496',
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});