import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "bin/stdio": "src/bin/stdio.ts",
    "bin/http": "src/bin/http.ts",
    "bin/cli": "src/bin/cli.ts",
  },
  format: ["esm"],
  target: "node18",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  // Keep external modules as-is (don't bundle node_modules)
  noExternal: [],
  external: [
    "@modelcontextprotocol/sdk",
    "axios",
    "cors",
    "dotenv",
    "express",
    "jose",
    "lru-cache",
    "pino",
    "pino-pretty",
    "zod",
  ],
});
