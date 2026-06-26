import type { Metadata } from "next";
import { Playfair_Display, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "react-hot-toast";
import "./globals.css";

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
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${ibmPlexMono.variable}`}>
      <body className="min-h-screen flex flex-col bg-noir2 text-cotton">
        <WalletProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </WalletProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1B1717',
              color: '#EDEBDD',
              border: '0.5px solid #2A2020',
              borderRadius: '2px',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
            },
          }}
        />
      </body>
    </html>
  );
}
