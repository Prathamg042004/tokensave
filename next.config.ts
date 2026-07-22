import type { NextConfig } from "next";

import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: "tokensave",
  project: "tokensave",
});
