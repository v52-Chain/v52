import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
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
        id: "/",
        theme_color: "#f7f7fb",
        background_color: "#f7f7fb",
        display: "standalone",
        start_url: "/",
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
      "/healthz": "http://127.0.0.1:8000",
      "/v1": "http://127.0.0.1:8000"
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
