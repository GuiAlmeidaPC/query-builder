import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { compression } from "vite-plugin-compression2";

export default defineConfig({
  base: "/querybuilder/",
  plugins: [react(), tailwindcss(), compression({ algorithms: ["gzip"] })],
  server: {
    proxy: {
      "/querybuilder/query": {
        target: "http://localhost:8000",
        rewrite: (path) => path.replace(/^\/querybuilder/, ""),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "vendor";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "icons";
          }
        },
      },
    },
  },
});
