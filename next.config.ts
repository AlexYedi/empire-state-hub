import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project. Without this, a stray ~/package-lock.json
  // makes Next infer the home directory as the root (build warning + wrong env resolution).
  turbopack: {
    root: path.resolve(),
  },
};

export default nextConfig;
