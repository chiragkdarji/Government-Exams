import type { Metadata } from "next";
import { Playfair_Display, IBM_Plex_Sans } from "next/font/google";

export const metadata: Metadata = {
  title: {
    default: "Finance & Business News India | Rizz Jobs",
    template: "%s | Rizz Jobs News",
  },
  description:
    "Latest Indian finance, business, markets, economy and startup news.",
  openGraph: { siteName: "Rizz Jobs", locale: "en_IN", type: "website" },
};
import dynamic from "next/dynamic";
import BreakingNewsBanner from "@/components/BreakingNewsBanner";
import HeadlineTicker from "@/components/HeadlineTicker";
import BackToTop from "@/components/BackToTop";

const MarketTicker    = dynamic(() => import("@/components/MarketTicker"),    { ssr: false });
const FiiDiiBar       = dynamic(() => import("@/components/FiiDiiBar"),       { ssr: false });
const CryptoTicker    = dynamic(() => import("@/components/CryptoTicker"),    { ssr: false });

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "700"],
});

const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "NewsMediaOrganization",
  "@id": "https://rizzjobs.in/#newsmediaorganization",
  name: "Rizz Jobs",
  url: "https://rizzjobs.in",
  logo: {
    "@type": "ImageObject",
    url: "https://rizzjobs.in/logo.png",
    width: 512,
    height: 512,
  },
  foundingDate: "2024",
  publishingPrinciples: "https://rizzjobs.in/about",
  masthead: "https://rizzjobs.in/about",
  actionableFeedbackPolicy: "https://rizzjobs.in/contact",
  correctionsPolicy: "https://rizzjobs.in/disclaimer",
  sameAs: ["https://rizzjobs.in"],
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${playfair.variable} ${ibmPlex.variable}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <BreakingNewsBanner />
      <MarketTicker />
      <FiiDiiBar />
      <CryptoTicker />
      <HeadlineTicker />
      {children}
      <BackToTop />
    </div>
  );
}
