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
      // IPL → /cricket/ipl/* (301 permanent)
      { source: "/ipl", destination: "/cricket/ipl", permanent: true },
      { source: "/ipl/:path*", destination: "/cricket/ipl/:path*", permanent: true },
      // Legacy /news/ipl/* (still chain through to new location)
      { source: "/news/ipl", destination: "/cricket/ipl", permanent: true },
      { source: "/news/ipl/:path*", destination: "/cricket/ipl/:path*", permanent: true },
      // Legal pages consolidation
      { source: "/news/about", destination: "/about", permanent: true },
      { source: "/news/contact", destination: "/contact", permanent: true },
      { source: "/news/privacy", destination: "/privacy", permanent: true },
      { source: "/news/terms", destination: "/terms", permanent: true },
      { source: "/news/disclaimer", destination: "/disclaimer", permanent: true },
      // Job category pages → /jobs/* (301 permanent)
      { source: "/10th-12th-pass", destination: "/jobs/10th-12th-pass", permanent: true },
      { source: "/banking", destination: "/jobs/banking", permanent: true },
      { source: "/railway", destination: "/jobs/railway", permanent: true },
      { source: "/defense-police", destination: "/jobs/defense-police", permanent: true },
      { source: "/upsc-ssc", destination: "/jobs/upsc-ssc", permanent: true },
      { source: "/teaching", destination: "/jobs/teaching", permanent: true },
      { source: "/engineering", destination: "/jobs/engineering", permanent: true },
      { source: "/medical", destination: "/jobs/medical", permanent: true },
      { source: "/psu", destination: "/jobs/psu", permanent: true },
      { source: "/admit-cards", destination: "/jobs/admit-cards", permanent: true },
      { source: "/results", destination: "/jobs/results", permanent: true },
      { source: "/state-jobs", destination: "/jobs/state-jobs", permanent: true },
    ];
  },
};

export default nextConfig;
