import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow larger body size for file uploads (50 MB)
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },

  // Transpile Three.js packages for Turbopack compatibility
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],

  // Allow cross-origin images (Cloudinary, etc.)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
