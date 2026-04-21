"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, LayoutDashboard, Mail, Info, Phone, Shield } from "lucide-react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
}

const MORE_LINKS = [
  { label: "Dashboard",     href: "/dashboard", icon: LayoutDashboard },
  { label: "Subscribe",     href: "/subscribe",  icon: Mail },
  { label: "About",         href: "/about",      icon: Info },
  { label: "Contact",       href: "/contact",    icon: Phone },
  { label: "Privacy Policy",href: "/privacy",    icon: Shield },
];

export default function Sheet({ open, onClose }: SheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[70] md:hidden rounded-t-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="More options"
        style={{ background: "#0d111c", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "90vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 border-b border-white/5">
          <span className="text-sm font-bold text-white">More</span>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Links */}
        <div
          className="px-3 py-2 overflow-y-auto"
          style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
        >
          {MORE_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                style={{ minHeight: "44px" }}
              >
                <Icon className="w-5 h-5 text-gray-500 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
