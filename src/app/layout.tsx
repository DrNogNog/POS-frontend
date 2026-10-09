import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

// Fonts load from Google Fonts in the browser rather than at build time, so
// the app still starts when the computer is offline (it falls back to the
// system fonts until the internet is back).
//   Body text: Source Sans 3 — calm, open shapes made for long reading on screens.
//   Titles and key figures: Cormorant Garamond.
const FONTS =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Source+Sans+3:ital,wght@0,300..900;1,300..900&display=swap";

export const metadata: Metadata = {
  title: "Champion POS",
  description: "Point of sale, receivables, payables and inventory",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
