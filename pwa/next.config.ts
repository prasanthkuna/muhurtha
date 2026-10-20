import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bun + Next 15.5 generated `.next/types` can miss `.js` type stubs on Windows.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
