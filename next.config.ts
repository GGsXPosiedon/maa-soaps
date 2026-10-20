import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: { workerThreads: true, cpus: 1, webpackBuildWorker: false, useTypeScriptCli: false },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@designcodeio/threeui$": path.resolve("lib/threeui/index.js"),
      "@designcodeio/threeui/style.css$": path.resolve("lib/threeui/style.css"),
    };
    return config;
  },
};

export default nextConfig;
