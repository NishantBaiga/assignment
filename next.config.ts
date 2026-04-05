import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Prevents Mongoose from being bundled on the client
  serverExternalPackages: ["mongoose"],
};

export default nextConfig;
