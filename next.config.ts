import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Baileys + its deps are Node-only and must not be bundled by Next/Turbopack.
  serverExternalPackages: ["@whiskeysockets/baileys", "pino", "pino-pretty"],
};

export default nextConfig;
