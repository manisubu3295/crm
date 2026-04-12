import { build } from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

await build({
  entryPoints: [path.join(root, "server/index.ts")],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: path.join(root, "dist/server.js"),
  external: [
    // Native modules
    "pg-native",
    "better-sqlite3",
    "puppeteer",
    "canvas",
    // Keep node_modules external
    ...Object.keys(
      JSON.parse(
        (await import("fs")).readFileSync(path.join(root, "package.json"), "utf-8")
      ).dependencies
    ),
  ],
  sourcemap: true,
  minify: false,
});

console.log("Server build complete: dist/server.js");
