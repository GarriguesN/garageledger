import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    // Without this, Turbopack infers the workspace root from the nearest
    // lockfile above this dir and can walk into unrelated sibling projects.
    root: path.join(__dirname),
  },
};

export default nextConfig;
