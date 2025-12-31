import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript strict mode
  typescript: {
    tsconfigPath: "./tsconfig.json",
  },
  
  // API proxy configuration
  rewrites: async () => {
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: "http://localhost:5000/v1/:path*",
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
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL 
  },
};

export default nextConfig;
