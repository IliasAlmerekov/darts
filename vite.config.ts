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
        "@/entities": path.resolve(__dirname, "./src/entities"),
        "@/features": path.resolve(__dirname, "./src/features"),
        "@/shared": path.resolve(__dirname, "./src/shared"),
        "@/components": path.resolve(__dirname, "./src/shared/ui"),
        "@/hooks": path.resolve(__dirname, "./src/shared/hooks"),
        "@/lib": path.resolve(__dirname, "./src/shared/lib"),
        "@/stores": path.resolve(__dirname, "./src/shared/stores"),
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
      environment: "node",
      globals: true,
      include: ["src/**/*.test.{ts,tsx}", "src/**/*.spec.{ts,tsx}"],
      exclude: ["specs/**"],
    },
  };
});
