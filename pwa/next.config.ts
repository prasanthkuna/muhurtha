import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Share cards render with Skia (native module) + bundled Noto fonts.
  serverExternalPackages: ["@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/api/card/[id]": ["./assets/fonts/**/*"],
    "/api/card/sample": ["./assets/fonts/**/*"],
  },
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
