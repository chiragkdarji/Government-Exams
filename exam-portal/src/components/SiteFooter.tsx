import Link from "next/link";
import { Sparkles } from "lucide-react";

const JOB_LINKS = [
  { label: "Banking",     href: "/jobs/banking" },
  { label: "Railway",     href: "/jobs/railway" },
  { label: "UPSC / SSC",  href: "/jobs/upsc-ssc" },
  { label: "Teaching",    href: "/jobs/teaching" },
  { label: "10th / 12th", href: "/jobs/10th-12th-pass" },
];

const NEWS_LINKS = [
  { label: "Finance",  href: "/news/finance" },
  { label: "Business", href: "/news/business" },
  { label: "Markets",  href: "/news/markets" },
  { label: "Economy",  href: "/news/economy" },
  { label: "Startups", href: "/news/startups" },
];

const CRICKET_LINKS = [
  { label: "Live Scores",  href: "/cricket/live" },
  { label: "IPL 2026",     href: "/cricket/ipl" },
  { label: "Points Table", href: "/cricket/ipl/points-table" },
  { label: "Rankings",     href: "/cricket/rankings" },
  { label: "Records",      href: "/cricket/records" },
];

const COMPANY_LINKS = [
  { label: "About",      href: "/about" },
  { label: "Contact",    href: "/contact" },
  { label: "Privacy",    href: "/privacy" },
  { label: "Terms",      href: "/terms" },
  { label: "Disclaimer", href: "/disclaimer" },
];

export default function SiteFooter() {
  return (
    <footer
      className="border-t border-white/5 pt-12 pb-20 md:pb-10 px-4 md:px-6"
      style={{ background: "#030712" }}
    >
      <div className="max-w-7xl mx-auto">
        {/* 4-column grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-4">Gov Jobs</p>
            <ul className="space-y-2.5">
              {JOB_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-gray-500 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-4">News</p>
            <ul className="space-y-2.5">
              {NEWS_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-gray-500 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-4">Cricket</p>
            <ul className="space-y-2.5">
              {CRICKET_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-gray-500 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-4">Company</p>
            <ul className="space-y-2.5">
              {COMPANY_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-gray-500 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-black tracking-tighter text-white italic">Rizz Jobs</span>
          </Link>
          <p className="text-xs text-gray-600">© 2026 Rizz Jobs. All rights reserved.</p>
          <Link href="/subscribe" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            Email Alerts
          </Link>
        </div>
      </div>
    </footer>
  );
}
