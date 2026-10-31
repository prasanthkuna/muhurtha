import type { NextConfig } from "next";

/** One id per build, baked into the client bundle and served by /api/version, so installed
 *  apps can notice a newer deploy and reload themselves (see components/pwa/sw-register). */
const BUILD_ID =
  process.env.VERCEL_DEPLOYMENT_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  `local-${Date.now().toString(36)}`;

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
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
      {
        source: "/api/version",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

export default nextConfig;
