import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isElectron = process.env.ELECTRON === "1";
  const isCapacitor = process.env.CAPACITOR === "1";
  // For Electron we need relative assets so file:// loads work
  const base = isElectron || isCapacitor ? "./" : mode === "development" ? "/" : "/app/";

  return {
    // Use repository name for GitHub Pages base path (or relative for Electron)
    base,
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
