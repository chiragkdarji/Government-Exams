import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.weserv.nl" },
      { protocol: "https", hostname: "cricbuzz-cricket.p.rapidapi.com" },
      { protocol: "https", hostname: "static.cricbuzz.com" },
      { protocol: "https", hostname: "cricbuzz-cricket.imgix.net" },
      { protocol: "https", hostname: "scores.iplt20.com" },
    ],
  },
  async redirects() {
    return [
      // Legacy IPL redirects
      { source: "/news/ipl", destination: "/ipl", permanent: true },
      { source: "/news/ipl/:path*", destination: "/ipl/:path*", permanent: true },
      // Legal pages consolidation
      { source: "/news/about", destination: "/about", permanent: true },
      { source: "/news/contact", destination: "/contact", permanent: true },
      { source: "/news/privacy", destination: "/privacy", permanent: true },
      { source: "/news/terms", destination: "/terms", permanent: true },
      { source: "/news/disclaimer", destination: "/disclaimer", permanent: true },
    ];
  },
};

export default nextConfig;
