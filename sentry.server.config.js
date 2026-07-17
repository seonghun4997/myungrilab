import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://30916ce5fa33d6804fa4993979c5f3c1@o4511750885670912.ingest.us.sentry.io/4511751334658048",
  tracesSampleRate: 0,
  enableLogs: false,
  debug: false,
});
