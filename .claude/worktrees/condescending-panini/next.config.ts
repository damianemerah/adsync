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
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.cdninstagram.com",
        port: "",
        pathname: "/v/**",
      },
      {
        protocol: "https",
        hostname: "v3b.fal.media",
        port: "",
        pathname: "/files/**",
      },
    ],
  },
};

export default nextConfig;
