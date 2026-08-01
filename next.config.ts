import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    // Without this, Turbopack infers the workspace root from the nearest
    // lockfile above this dir and can walk into unrelated sibling projects.
    root: path.join(__dirname),
    // @techstark/opencv-js (used by the document scan flow, lazy-loaded from
    // UploadDocumentModal) has a dead `if (ENVIRONMENT_IS_NODE) require("fs")`
    // branch that never runs in the browser, but Turbopack still tries to
    // resolve it statically. Same fix the package's README documents for
    // webpack (`resolve.fallback: { fs: false, path: false, crypto: false }`),
    // ported to Turbopack's condition-based resolveAlias.
    resolveAlias: {
      fs: { browser: "./src/shims/empty.js" },
      path: { browser: "./src/shims/empty.js" },
      crypto: { browser: "./src/shims/empty.js" },
    },
  },
};

export default nextConfig;
