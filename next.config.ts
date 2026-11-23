import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Allow opening the dev server from other devices on the local network.
  allowedDevOrigins: ["192.168.0.85", "localhost", "127.0.0.1"],
};

export default nextConfig;
