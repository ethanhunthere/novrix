import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  devIndicators: false,
  poweredByHeader: false,
  compress: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error'] } : false,
  },
  reactCompiler: true,
  experimental: {
    // Tree-shake named imports from large barrel packages
    optimizePackageImports: ['recharts', 'framer-motion', 'gsap'],
    // CSS optimization via Lightning CSS
    optimizeCss: true,
    // Parallelize script loading for static export
    parallelServerCompiles: true,
  },
};

export default nextConfig;
