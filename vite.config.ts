/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_TARGET || "http://localhost:8001";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@/app": path.resolve(__dirname, "./src/app"),
        "@/assets": path.resolve(__dirname, "./src/assets"),
        "@/pages": path.resolve(__dirname, "./src/pages"),
        "@/shared": path.resolve(__dirname, "./src/shared"),
        "@/store": path.resolve(__dirname, "./src/shared/store"),
        "@/lib": path.resolve(__dirname, "./src/shared/lib"),
        "@/types": path.resolve(__dirname, "./src/shared/types"),
        "@": path.resolve(__dirname, "./src"),
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
      setupFiles: ["./src/test/vitest.setup.tsx"],
      include: ["src/**/*.test.{ts,tsx}"],
      exclude: ["specs/**"],
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
