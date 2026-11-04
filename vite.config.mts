/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_TARGET || "http://localhost:8001";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@/app": path.resolve(configDir, "./src/app"),
        "@/assets": path.resolve(configDir, "./src/assets"),
        "@/pages": path.resolve(configDir, "./src/pages"),
        "@/shared": path.resolve(configDir, "./src/shared"),
        "@/lib": path.resolve(configDir, "./src/shared/lib"),
        "@/types": path.resolve(configDir, "./src/shared/types"),
        "@": path.resolve(configDir, "./src"),
      },
    },
    server: {
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader("origin", apiTarget);
            });
          },
        },
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      include: ["src/**/*.test.{ts,tsx}"],
      // Unit tests expect the default `/api` base, so a VITE_API_BASE_URL
      // from the shell or a .env file must not reach them.
      env: { VITE_API_BASE_URL: "" },
      coverage: {
        provider: "v8",
        reporter: ["text", "lcov", "html"],
        reportsDirectory: "coverage",
        include: ["src/**/*.{ts,tsx}"],
        exclude: ["src/**/*.test.{ts,tsx}", "src/**/*.d.ts", "src/main.tsx", "src/vite-env.d.ts"],
        thresholds: {
          lines: 75,
          functions: 70,
          branches: 65,
          statements: 75,
        },
      },
    },
  };
});
