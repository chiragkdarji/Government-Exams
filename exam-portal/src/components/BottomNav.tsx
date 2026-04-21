"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Newspaper, CircleDot, MoreHorizontal } from "lucide-react";
import Sheet from "./Sheet";

function getActiveTab(pathname: string): string {
  if (pathname.startsWith("/news"))                             return "news";
  if (pathname.startsWith("/cricket"))                          return "cricket";
  if (pathname === "/" || pathname.startsWith("/jobs") || pathname.startsWith("/exam")) return "jobs";
  return "jobs";
}

const TABS = [
  { id: "jobs",    label: "Jobs",    href: "/",        icon: Briefcase,   accent: "#6366f1" },
  { id: "news",    label: "News",    href: "/news",     icon: Newspaper,   accent: "#f0a500" },
  { id: "cricket", label: "Cricket", href: "/cricket",  icon: CircleDot,   accent: "#FFB800" },
];

export default function BottomNav() {
  const pathname  = usePathname();
  const activeTab = getActiveTab(pathname);
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex items-stretch"
        style={{
          background: "#0d111c",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          height: "calc(56px + env(safe-area-inset-bottom))",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        aria-label="Primary navigation"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5"
              style={{ minHeight: "44px" }}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className="w-5 h-5 transition-colors"
                style={{ color: isActive ? tab.accent : "#6b7280" }}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span
                className="text-[10px] font-semibold transition-colors"
                style={{ color: isActive ? tab.accent : "#6b7280" }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* More tab */}
        <button
          onClick={() => setShowMore(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5"
          style={{ minHeight: "44px" }}
          aria-label="More options"
        >
          <MoreHorizontal
            className="w-5 h-5 transition-colors"
            style={{ color: showMore ? "#6366f1" : "#6b7280" }}
            strokeWidth={1.5}
          />
          <span
            className="text-[10px] font-semibold transition-colors"
            style={{ color: showMore ? "#6366f1" : "#6b7280" }}
          >
            More
          </span>
        </button>
      </nav>

      <Sheet open={showMore} onClose={() => setShowMore(false)} />
    </>
  );
}
