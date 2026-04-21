"use client";
import dynamic from "next/dynamic";

const MarketTicker = dynamic(() => import("@/components/MarketTicker"), { ssr: false });
const FiiDiiBar    = dynamic(() => import("@/components/FiiDiiBar"),    { ssr: false });
const CryptoTicker = dynamic(() => import("@/components/CryptoTicker"), { ssr: false });

export default function NewsClientTickers() {
  return (
    <>
      <MarketTicker />
      <FiiDiiBar />
      <CryptoTicker />
    </>
  );
}
