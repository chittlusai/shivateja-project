import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  },
});
