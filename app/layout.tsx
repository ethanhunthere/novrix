import type { Metadata, Viewport } from "next";
import type React from "react";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
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
const siteTitle = "NOVRIX - Sentiment Intelligence & On-Chain Terminal";
const siteDescription = "Independent Bitcoin on-chain intelligence workspace. Real-time valuation models, holder behavior metrics, miner health, and macroeconomic overlays across historical market cycles.";

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
    images: [{ url: ogImage, width: 1200, height: 630, alt: 'NOVRIX · Sentiment Intelligence' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: [ogImage],
  },
  manifest: siteManifest,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NOVRIX',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#120F0D',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${newsreader.variable}`}
      style={{ background: '#120F0D' }}
    >
      <head>
        {/* Safari & Mobile System Bar Colors */}
        <meta name="theme-color" content="#120F0D" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#120F0D" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#120F0D" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

        {/* Explicit favicon links for crawler compatibility */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#C2344D" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* JSON-LD Structured Data for AI Crawlers & Search Engines */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${siteUrl}/#organization`,
                  name: "NOVRIX",
                  url: siteUrl,
                  logo: `${siteUrl}/android-chrome-512x512.png`,
                  description: siteDescription,
                  publishingPrinciples: `${siteUrl}/documentation#policy`,
                },
                {
                  "@type": "WebSite",
                  "@id": `${siteUrl}/#website`,
                  name: "NOVRIX",
                  url: siteUrl,
                  description: siteDescription,
                  publisher: { "@id": `${siteUrl}/#organization` },
                  inLanguage: "en-US",
                },
                {
                  "@type": "WebApplication",
                  "@id": `${siteUrl}/#app`,
                  name: "NOVRIX Terminal",
                  url: siteUrl,
                  description: siteDescription,
                  applicationCategory: "FinanceApplication",
                  operatingSystem: "Any",
                  browserRequirements: "Requires modern web browser with JavaScript enabled",
                  offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "USD",
                  },
                  featureList: [
                    "94 live Bitcoin on-chain and macroeconomic indicators",
                    "Dual 1Y and ALL cycle timeframes with logarithmic price scales",
                    "Historical Bitcoin halving reference epochs",
                    "Distribution zone bands for accumulation and top detection",
                    "PNG chart capture for financial research and reports",
                    "Zero account sign-up and zero tracking cookies",
                  ],
                },
                {
                  "@type": "BreadcrumbList",
                  "@id": `${siteUrl}/#breadcrumbs`,
                  itemListElement: [
                    {
                      "@type": "ListItem",
                      position: 1,
                      name: "Home",
                      item: siteUrl,
                    },
                  ],
                },
              ],
            }),
          }}
        />
      </head>
      <body
        className="font-sans antialiased min-h-screen flex flex-col text-white overflow-y-auto bg-[#120F0D]"
        style={{
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

        {children}
      </body>
    </html>
  );
}
