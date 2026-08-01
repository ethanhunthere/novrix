const siteUrl = "https://novrix.io";
const ogImageUrl = `${siteUrl}/og-image.png`;
const ogImageAlt = "NOVRIX - Trinity of Intelligence";

export const defaultOgImages = [
  {
    url: ogImageUrl,
    secureUrl: ogImageUrl,
    width: 1200,
    height: 630,
    type: "image/png" as const,
    alt: ogImageAlt,
  },
];

export const defaultTwitterImages = [
  {
    url: ogImageUrl,
    alt: ogImageAlt,
  },
];
