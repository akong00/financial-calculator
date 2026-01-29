import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // basePath: '/financial-calculator',
  images: {
    unoptimized: true, // Required for GitHub Pages
  },
};

export default nextConfig;
