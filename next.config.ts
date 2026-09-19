import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Les images d'illustration sont des SVG generes localement : pas de domaine distant requis.
  images: { formats: ["image/avif", "image/webp"] },
};

export default nextConfig;
