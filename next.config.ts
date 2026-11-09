import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image.
  output: "standalone",
  // The dev badge would otherwise show up in PDFs printed from a dev server.
  devIndicators: false,
  serverExternalPackages: ["puppeteer-core"],
  experimental: {
    // Request bodies pass through the proxy, which keeps only the first 10 MB by default.
    // A backup with a few photos is larger than that. Keep in step with MAX_UPLOAD in lib/server/upload.
    proxyClientMaxBodySize: "100mb",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ]
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
