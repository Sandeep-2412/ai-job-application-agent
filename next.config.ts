import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse loads the PDF.js worker via a relative dynamic import, which
  // breaks when the package is bundled. Load it from node_modules at runtime.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
