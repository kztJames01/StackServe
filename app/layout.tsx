import type { Metadata } from "next";
import { Antonio, Geist, Geist_Mono } from "next/font/google";
import Providers from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const antonio = Antonio({
  subsets: ["latin"],
  variable: "--font-antonio",
  weight: "400",
});

export const metadata: Metadata = {
  title: "MakerSpace",
  description: "Community of Creators",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${antonio.variable} bg-white font-[family-name:var(--font-geist-mono)] antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


