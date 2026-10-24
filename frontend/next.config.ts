import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Tell Turbopack to resolve 'canvas' via our empty mock so
    // pdfjs-dist's Node.js canvas factory doesn't crash the browser build.
    resolveAlias: {
      canvas: "./src/mocks/canvas.js",
    },
  },

  env: {
    NEXT_PUBLIC_ANTHROPIC_API_KEY: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || "",
  },

  webpack: (config, { isServer }) => {
    // Webpack (non-Turbopack) fallback: alias canvas to false in browser
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
    }
    // Required for tesseract.js WASM
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
};

export default nextConfig;
