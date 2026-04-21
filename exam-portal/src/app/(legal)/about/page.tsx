import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | Rizz Jobs",
  description: "About Rizz Jobs — India's government job notifications, AI-curated financial news, and live cricket scores.",
  alternates: { canonical: "https://rizzjobs.in/about" },
};

export default function AboutPage() {
  return (
    <div style={{ backgroundColor: "#070708", minHeight: "100vh" }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">

        <p className="text-[9px] font-black uppercase tracking-[0.22em] mb-4" style={{ color: "#f0a500" }}>
          About
        </p>
        <h1
          className="text-[clamp(2rem,5vw,3rem)] text-[#f2ede6] leading-[1.1] mb-8"
          style={{ fontFamily: "'DM Serif Display', 'Georgia', serif", fontWeight: 400 }}
        >
          Financial Intelligence for the Indian Professional
        </h1>

        <div className="space-y-5 text-[14px] leading-[1.85]" style={{ color: "#9a9699" }}>
          <p>
            Rizz Jobs is India&apos;s destination for government job notifications, AI-curated financial news, and live cricket coverage — all in one place.
          </p>
          <p>
            Our Financial Intelligence service aggregates news from credible Indian and global financial sources, then uses AI to rewrite, contextualise, and categorise each story — adding market implications, Indian investor perspective, and concise summaries that respect your time.
          </p>
          <p>
            We publish several times a day across five coverage areas: Finance, Business, Markets, Economy, and Startups. Every article is reviewed for accuracy and relevance before publication.
          </p>

          <div
            className="py-6 my-6"
            style={{ borderTop: "1px solid #1e1e24", borderBottom: "1px solid #1e1e24" }}
          >
            <p className="text-[9px] font-black uppercase tracking-[0.22em] mb-4" style={{ color: "#7c7888" }}>
              Our Coverage
            </p>
            <ul className="space-y-2">
              {[
                ["Finance", "RBI policy, banking, mutual funds, insurance, personal finance"],
                ["Business", "Corporate earnings, M&A, industry news, company results"],
                ["Markets", "Nifty, Sensex, NSE, BSE, IPOs, F&O, commodities"],
                ["Economy", "GDP, inflation, fiscal policy, trade, employment"],
                ["Startups", "Funding rounds, unicorns, VC/PE deals, Indian tech ecosystem"],
                ["Government Jobs", "Exam dates, deadlines, eligibility & vacancies across Banking, Railway, UPSC, SSC, Teaching"],
                ["Cricket / IPL", "Live international scores, IPL 2026 standings, rankings, and records"],
              ].map(([cat, desc]) => (
                <li key={cat} className="flex gap-3 text-[13px]">
                  <span style={{ color: "#f0a500" }} className="shrink-0 font-black">{cat}</span>
                  <span style={{ color: "#7c7888" }}>— {desc}</span>
                </li>
              ))}
            </ul>
          </div>

          <p>
            For questions, corrections, or editorial feedback, please <Link href="/contact" className="transition-colors hover:text-[#f2ede6]" style={{ color: "#f0a500" }}>contact us</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
