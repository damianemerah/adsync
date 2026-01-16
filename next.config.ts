import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "iomvjxlfxeppizkhehcl.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/creatives/**",
      },
      {
        protocol: "https",
        hostname: "scontent-ams2-1.cdninstagram.com",
        port: "",
        pathname: "/v/**",
      },
    ],
  },
};

export default nextConfig;
