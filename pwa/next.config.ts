import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Type errors fail the build again (scripts/ are Bun-only and excluded in tsconfig).
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
