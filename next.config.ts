import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "en.changfanz.com", pathname: "/uploads/**" },
    ],
  },
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'self'; object-src 'none'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https:; font-src 'self' data: https:; frame-src https://www.openstreetmap.org; form-action 'self' https://wa.me https://api.whatsapp.com; frame-ancestors 'self'" },
    ];
    return [
      { source: "/(.*)", headers: security },
      { source: "/admin/:path*", headers: [...security.filter((header) => header.key !== "Content-Security-Policy"), { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'self'; object-src 'none'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https:; font-src 'self' data: https:; frame-ancestors 'none'" }] },
      { source: "/api/admin/:path*", headers: [...security.filter((header) => header.key !== "Content-Security-Policy"), { key: "Content-Security-Policy", value: "default-src 'none'; frame-ancestors 'none'" }] },
    ];
  },
};

export default nextConfig;
