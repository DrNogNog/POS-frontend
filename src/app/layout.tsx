import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Champion POS",
  description: "Point of sale, receivables, payables and inventory",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={publicSans.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
