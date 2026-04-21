"use client";

import { useState, useId } from "react";
import { ChevronDown } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();
  const contentId = `collapsible-${id.replace(/:/g, "")}`;

  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
        style={{ minHeight: "44px" }}
      >
        <span className="text-sm font-semibold text-white">{title}</span>
        <ChevronDown
          className="w-4 h-4 text-gray-500 shrink-0 transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      <div
        id={contentId}
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: isOpen ? "9999px" : "0px" }}
      >
        <div className="px-5 pb-5 border-t border-white/5 pt-4">{children}</div>
      </div>
    </div>
  );
}
