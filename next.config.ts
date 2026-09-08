import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "en.changfanz.com", pathname: "/uploads/**" },
    ],
  },
};

export default nextConfig;
