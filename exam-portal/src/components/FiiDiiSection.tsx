"use client";

import { useEffect, useState } from "react";

interface FiiDiiData {
  date: string;
  fii: { buy: number; sell: number; net: number };
  dii: { buy: number; sell: number; net: number };
}

function formatCr(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 10000) return `₹${(abs / 1000).toFixed(1)}K Cr`;
  return `₹${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })} Cr`;
}

function formatDate(d: string): string {
  const parts = d.split("-");
  return `${parts[0]} ${parts[1]} ${parts[2]}`;
}

function FlowBar({ label, value, type }: { label: string; value: number; type: "fii" | "dii" }) {
  const up = value >= 0;
  const color = up ? "#22c55e" : "#f43f5e";
  const accent = type === "fii" ? "#3b82f6" : "#a855f7";
  const action = up ? "NET BUY" : "NET SELL";

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg"
      style={{ background: "#0d0d14", border: "1px solid #1a1a24" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0"
          style={{ background: `${accent}18`, color: accent }}
        >
          {type === "fii" ? "FII" : "DII"}
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: "#555466" }}>
            {label}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "#3a3848" }}>{action}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[15px] font-bold tabular-nums" style={{ color }}>
          {up ? "+" : "−"}{formatCr(value)}
        </p>
      </div>
    </div>
  );
}

export default function FiiDiiSection() {
  const [data, setData] = useState<FiiDiiData | null>(null);

  useEffect(() => {
    fetch("/api/fii-dii")
      .then((r) => r.json())
      .then((d) => { if (d.fii) setData(d); })
      .catch(() => {});
  }, []);

  if (!data) return null;

  const sentiment = !data.fii.net && data.dii.net
    ? "DIIs absorbing FII selling"
    : data.fii.net >= 0 && data.dii.net >= 0
    ? "Both buying — bullish sentiment"
    : data.fii.net >= 0
    ? "FIIs driving markets higher"
    : "Heavy institutional selling";

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "#09090e", border: "1px solid #1a1a24" }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: "1px solid #1a1a24" }}
      >
        <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#555466" }}>
          Institutional Flow
        </span>
        <span className="text-[9px]" style={{ color: "#3a3848" }}>
          {formatDate(data.date)}
        </span>
      </div>
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <FlowBar label="FII / FPI" value={data.fii.net} type="fii" />
        <FlowBar label="DII" value={data.dii.net} type="dii" />
      </div>
      <div
        className="px-4 py-2 text-[9px] uppercase tracking-[0.14em]"
        style={{ color: "#3a3848", borderTop: "1px solid #1a1a24" }}
      >
        {sentiment}
      </div>
    </div>
  );
}
