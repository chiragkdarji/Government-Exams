"use client";

import dynamic from "next/dynamic";

const IndianMarketsCards = dynamic(() => import("@/components/IndianMarketsCards"), { ssr: false });
const WorldMarketsRow    = dynamic(() => import("@/components/WorldMarketsRow"),    { ssr: false });
const MarketMovers       = dynamic(() => import("@/components/MarketMovers"),       { ssr: false });
const FiiDiiSection      = dynamic(() => import("@/components/FiiDiiSection"),      { ssr: false });
const CryptoCards        = dynamic(() => import("@/components/CryptoCards"),        { ssr: false });

export default function NewsMarketWidgets() {
  return (
    <div className="mt-10 space-y-3">
      <div className="flex items-center gap-3">
        <span
          className="text-[10px] font-black uppercase tracking-[0.22em]"
          style={{ color: "#f0a500" }}
        >
          Market Snapshot
        </span>
        <div className="flex-1" style={{ height: "1px", background: "#1e1e26" }} />
      </div>

      <IndianMarketsCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <WorldMarketsRow />
        </div>
        <div>
          <MarketMovers />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <FiiDiiSection />
        <CryptoCards />
      </div>
    </div>
  );
}
