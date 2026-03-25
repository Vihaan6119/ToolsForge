import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/ToolsForge",
  trailingSlash: true,
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
