import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Prevents Mongoose from being bundled on the client
  serverExternalPackages: ["mongoose"],
   allowedDevOrigins: ['192.168.29.15'],
};

export default nextConfig;
