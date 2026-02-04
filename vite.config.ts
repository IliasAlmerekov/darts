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
        "@": path.resolve(__dirname, "./src"),
        "@/app": path.resolve(__dirname, "./src/app"),
        "@/assets": path.resolve(__dirname, "./src/assets"),
        "@/components": path.resolve(__dirname, "./src/components"),
        "@/features": path.resolve(__dirname, "./src/features"),
        "@/hooks": path.resolve(__dirname, "./src/hooks"),
        "@/lib": path.resolve(__dirname, "./src/lib"),
        "@/providers": path.resolve(__dirname, "./src/providers"),
        "@/routes": path.resolve(__dirname, "./src/routes"),
        "@/services": path.resolve(__dirname, "./src/services"),
        "@/stores": path.resolve(__dirname, "./src/stores"),
        "@/types": path.resolve(__dirname, "./src/types"),
        "@/utils": path.resolve(__dirname, "./src/utils"),
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
      environment: "node",
      globals: true,
      include: ["src/**/*.test.{ts,tsx}", "src/**/*.spec.{ts,tsx}"],
      exclude: ["specs/**"],
    },
  };
});
