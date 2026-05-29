import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Strata — See the performance layers your POS never showed you",
  description:
    "Connect your Square, Toast, or Vagaro data. Strata tells you which employees drive repeat customers, which shifts are costing you more than they earn, and where to reallocate hours to make more money.",
  openGraph: {
    title: "Strata",
    description: "Staff performance intelligence for small businesses.",
    siteName: "Strata",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={`${inter.variable} font-sans bg-slate-950 text-slate-100 antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
