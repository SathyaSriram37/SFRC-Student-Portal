import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  images: {
    localPatterns: [
      { pathname: '/**', search: '' },
    ],
  },
};

export default nextConfig;

