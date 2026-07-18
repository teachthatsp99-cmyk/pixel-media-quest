import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));
const pagesBase = "/pixel-media-quest/";

export default defineConfig({
  root: path.join(rootDirectory, "github-pages"),
  base: pagesBase,
  publicDir: path.join(rootDirectory, "public"),
  plugins: [
    {
      name: "pixel-media-quest-pages-paths",
      enforce: "pre",
      transform(source, id) {
        if (
          !id.includes("/app/") ||
          (!id.endsWith(".tsx") &&
            !id.endsWith(".ts") &&
            !id.endsWith(".css"))
        ) {
          return null;
        }
        return source.replaceAll('"/assets/', `"${pagesBase}assets/`);
      },
    },
    react(),
  ],
  resolve: {
    alias: {
      "next/image": path.join(rootDirectory, "github-pages/next-image.tsx"),
    },
  },
  build: {
    outDir: path.join(rootDirectory, "dist-pages"),
    emptyOutDir: true,
  },
});
