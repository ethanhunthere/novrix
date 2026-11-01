import DocumentationView from '@/components/documentation/DocumentationView';
import { defaultOgImages, defaultTwitterImages } from '@/lib/og-config';

export const metadata = {
  title: 'Novrix - Docs',
  description: 'Complete documentation for the NOVRIX on-chain intelligence workspace, analytical methodology, platform architecture, data policy, and operations.',
  keywords: ['NOVRIX documentation', 'crypto analytics guide', 'how to use NOVRIX', 'sentiment methodology', 'on-chain indicators'],
  alternates: {
    canonical: 'https://novrix.io/documentation',
  },
  openGraph: {
    title: 'Novrix - Docs',
    description: 'Complete documentation for the NOVRIX on-chain intelligence workspace, analytical methodology, platform architecture, data policy, and operations.',
    url: 'https://novrix.io/documentation',
    images: defaultOgImages,
  },
  twitter: {
    title: 'Novrix - Docs',
    description: 'Complete documentation for the NOVRIX on-chain intelligence workspace, analytical methodology, platform architecture, data policy, and operations.',
    images: defaultTwitterImages,
  },
};

const docJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'TechArticle',
      '@id': 'https://novrix.io/documentation#article',
      name: 'NOVRIX Documentation & System Reference',
      headline: 'Complete technical reference for the NOVRIX on-chain and macroeconomic intelligence terminal.',
      description: 'Comprehensive documentation covering workspace controls, analytical methodology, primary data providers, update schedules, operational principles, and privacy disclosures.',
      url: 'https://novrix.io/documentation',
      inLanguage: 'en',
      author: {
        '@type': 'Organization',
        name: 'NOVRIX',
        url: 'https://novrix.io',
      },
      publisher: {
        '@type': 'Organization',
        name: 'NOVRIX',
        url: 'https://novrix.io',
      },
    },
    {
      '@type': 'FAQPage',
      '@id': 'https://novrix.io/documentation#faq',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is NOVRIX?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'NOVRIX is an autonomous, open-source Bitcoin on-chain and macroeconomic intelligence terminal. It reads blockchain ledger mechanics, valuation models, and central bank liquidity into a single calm analytical interface.',
          },
        },
        {
          '@type': 'Question',
          name: 'Where does NOVRIX source its on-chain and macroeconomic data?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Bitcoin on-chain metrics are provided by BGeometrics. Macroeconomic indicators (treasury yield curve, inflation metrics, money supply aggregates, Fed funds rate) are sourced from the Federal Reserve Bank of St. Louis (FRED). Sentiment metrics are provided by Alternative.me, and market dominance by CoinMarketCap and CoinGecko.',
          },
        },
        {
          '@type': 'Question',
          name: 'When are NOVRIX indicators updated?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'On-chain indicators from BGeometrics and the Fear & Greed Index are ingested daily at 04:00 UTC. Macroeconomic indicators from FRED update automatically according to official release series schedules.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does NOVRIX require an account or subscription?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. NOVRIX is completely free, open source, and requires no account registration, login, subscription, or payment. No user data, passwords, or personal credentials are required or stored.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does NOVRIX track users or run behavioral advertising?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. NOVRIX operates with zero tracking scripts, zero Google Analytics, zero Meta Pixels, and zero advertising networks. Only tab-scoped browser sessionStorage is used locally to cache indicator responses and avoid duplicate network fetches.',
          },
        },
        {
          '@type': 'Question',
          name: 'What is the difference between Bitcoin Market Cap and Realized Cap?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Market Cap values all circulating Bitcoin at the latest spot market transaction price. Realized Cap values each unspent transaction output (UTXO) at the price when it last moved on the blockchain, representing the aggregate cost basis of all market participants.',
          },
        },
      ],
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://novrix.io/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Documentation',
          item: 'https://novrix.io/documentation',
        },
      ],
    },
  ],
};

export default function DocumentationPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(docJsonLd) }}
      />
      <DocumentationView />
    </>
  );
}
