import type { Metadata } from "next";
import { Atkinson_Hyperlegible_Next, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

// Body text: designed by the Braille Institute for maximum legibility.
const body = Atkinson_Hyperlegible_Next({ subsets: ["latin"], variable: "--font-body", display: "swap" });
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
