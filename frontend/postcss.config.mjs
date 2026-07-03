import path from "path";
import { fileURLToPath } from "url";

// build runs from repo root so tailwind can't find the config on its own
const dir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: { config: path.join(dir, "tailwind.config.ts") },
  },
};

export default config;
