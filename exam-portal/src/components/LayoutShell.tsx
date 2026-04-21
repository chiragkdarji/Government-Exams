"use client";

import { usePathname } from "next/navigation";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import BottomNav from "./BottomNav";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin  = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader />
      {/* pb-14 reserves space for the 56px bottom nav on mobile */}
      <div className="pb-14 md:pb-0">
        {children}
      </div>
      <SiteFooter />
      <BottomNav />
    </>
  );
}
