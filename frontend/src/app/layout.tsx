import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono, Playfair_Display, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "RAW$ — Real yield. No bullshit.",
  description: "IL-aware yield optimizer on Stellar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${spaceGrotesk.variable} ${spaceMono.variable} ${playfair.variable} ${dmSans.variable} ${ibmPlexMono.variable}`}>
      <body className={`${spaceGrotesk.variable} ${spaceMono.variable} min-h-screen bg-[#faf3e4] text-[#0f1b2d]`} style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
        <WalletProvider>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:bg-[#810100] focus:text-white focus:px-4 focus:py-2 focus:top-2 focus:left-2 focus:rounded-lg">
            Skip to content
          </a>
          <SiteChrome>{children}</SiteChrome>
        </WalletProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0f1b2d',
              color: '#f5e9d0',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              fontFamily: "'Space Mono', monospace",
              fontSize: '12px',
            },
          }}
        />
      </body>
    </html>
  );
}
