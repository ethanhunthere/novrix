import type { Metadata, Viewport } from "next";
import type React from "react";
import { Inter, JetBrains_Mono, Barlow_Semi_Condensed } from "next/font/google";
import "./globals.css";
import { CLIProvider } from "@/lib/state/CLIContext";
import { AuthGateProvider } from "@/lib/state/AuthGateContext";
import GlobalCLI from "@/components/cli/GlobalCLI";
import AuthGate from "@/components/auth/AuthGate";

// Weights audited from grep across app/ + components/: actual usage is
// 400 (normal), 500 (medium), 600 (semibold), 700 (bold), 800, 900 (black).
// `font-black` (900) appears widely in headings; previously the font file
// did not ship 900 and the browser synthesised it.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const barlow = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-barlow",
  display: "swap",
});

const faviconIco = '/favicon.ico';
const appleTouchIcon = '/apple-touch-icon.png';
const android192 = '/android-chrome-192x192.png';
const android512 = '/android-chrome-512x512.png';
const maskIcon = '/safari-pinned-tab.svg';
const ogImage = '/og-image.png';
const siteManifest = '/site.webmanifest';
const siteUrl = "https://novrix.io";
const siteTitle = "NOVRIX - Trinity of Intelligence";
const siteDescription = "NOVRIX is an on-chain intelligence terminal with three modules: Sentiment (market psychology indicators), Tracking (whale monitoring across 12 chains), and Metrilytics (DeFi analytics). Open source.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "NOVRIX",
  title: { default: siteTitle, template: "%s" },
  description: siteDescription,
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: faviconIco,
    apple: appleTouchIcon,
  },
  openGraph: {
    images: [{ url: ogImage, width: 1200, height: 630, alt: 'NOVRIX — Trinity of Intelligence' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: [ogImage],
  },
  manifest: siteManifest,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0A0A0F',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ background: '#09090B' }}>
      <head>
        {/* Explicit favicon links for crawler compatibility */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#C2344D" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* JSON-LD Structured Data for AI Crawlers */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "NOVRIX",
              url: siteUrl,
              logo: `${siteUrl}/android-chrome-512x512.png`,
              description: siteDescription,
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "NOVRIX",
              url: siteUrl,
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${siteUrl}/terminal?search={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "NOVRIX",
              url: siteUrl,
              description: siteDescription,
              operatingSystem: "Any",
              applicationCategory: "FinanceApplication",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              featureList: [
                "Sentiment Intelligence — 17 market psychology indicators with macro overlays",
                "Tracking Intelligence — Whale monitoring across 12 blockchain networks",
                "Metrilytics Intelligence — DeFi protocol analytics and TVL tracking",
                "Real-time data aggregation from multiple sources",
                "Interactive charts with multiple timeframes",
                "Command-line interface for power users",
                "Dark-mode terminal interface",
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${barlow.variable} font-sans antialiased min-h-screen flex flex-col text-white overflow-y-scroll bg-[#09090B]`}
        style={{
          scrollBehavior: 'smooth',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          textRendering: 'optimizeLegibility',
        }}
      >
        {/* Subtle ambient gradient layer */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(194, 52, 77, 0.03) 0%, transparent 55%)'
          }}
        />

        <AuthGateProvider>
          <CLIProvider>
            {children}
            <GlobalCLI />
          </CLIProvider>
          <AuthGate />
        </AuthGateProvider>
      </body>
    </html>
  );
}
