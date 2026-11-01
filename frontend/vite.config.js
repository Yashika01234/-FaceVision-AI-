import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development the React app runs on :5173 and forwards /api calls to Flask.
// 127.0.0.1 (not "localhost") avoids an IPv6 mismatch on newer Node versions.
const apiTarget = process.env.VITE_API_PROXY || "http://127.0.0.1:5001";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": { target: apiTarget, changeOrigin: true } },
  },
});
