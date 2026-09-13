import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const apiProxyTarget = env.VITE_API_PROXY_TARGET?.trim() || "http://127.0.0.1:8000";
  return ({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "icon.svg",
        "icons/icon-192.svg",
        "icons/icon-512.svg",
        "images/vector52-hero.webp",
        "images/evidence-layers.webp",
        "sponsors/the-graph.png",
        "sponsors/uniswap.png",
        "sponsors/bazantic.png"
      ],
      devOptions: {
        enabled: true
      },
      manifest: {
        name: "Vector52 Forensic Flow",
        short_name: "Vector52",
        description: "Wallet flow investigation with verifiable onchain evidence.",
        id: "/app",
        theme_color: "#f7f7fb",
        background_color: "#f7f7fb",
        display: "standalone",
        start_url: "/app",
        scope: "/",
        icons: [
          {
            src: "/icons/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any"
          },
          {
            src: "/icons/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "document",
            handler: "NetworkFirst",
            options: { cacheName: "vector52-navigation" }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      "/healthz": { target: apiProxyTarget, changeOrigin: true },
      "/v1": { target: apiProxyTarget, changeOrigin: true }
    }
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./tests/setup.ts",
    css: true,
    pool: "threads",
    maxWorkers: 1
  }
  });
});
