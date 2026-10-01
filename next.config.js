const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  // 紅線 소개팅 종료(2026-10) — 광고·공유로 남은 옛 관문 주소는 홈으로
  async redirects() {
    return [{ source: "/hongseon", destination: "/", permanent: false }];
  },
};

module.exports = withSentryConfig(nextConfig, {
  org: "51cc0ae70f53",
  project: "myungrilab",
  silent: !process.env.CI,
  telemetry: false,
});
