import type { NextConfig } from "next";

// Where the /api/* rewrite forwards to. Set API_PROXY_TARGET when the backend
// is deployed separately; otherwise it follows NEXT_PUBLIC_API_URL.
const API_PROXY_TARGET =
  process.env.API_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

const nextConfig: NextConfig = {
  // TypeScript strict mode
  typescript: {
    tsconfigPath: "./tsconfig.json",
  },
  experimental: {
    useTypeScriptCli: true,
  },
  allowedDevOrigins: ["192.168.100.7"],

  // API proxy configuration
  rewrites: async () => {
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${API_PROXY_TARGET}/v1/:path*`,
        },
      ],
    };
  },

  // Security headers
  headers: async () => {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

export default nextConfig;
