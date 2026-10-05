import type { Metadata } from "next";
import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

// Body text: Source Sans 3 — calm, open shapes made for long reading on
// screens, with a plain (unslashed) zero and even-width figures for money.
const body = Source_Sans_3({ subsets: ["latin"], variable: "--font-body", display: "swap" });
// Titles and key figures.
const title = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-title", display: "swap" });

export const metadata: Metadata = {
  title: "Champion POS",
  description: "Point of sale, receivables, payables and inventory",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${title.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
