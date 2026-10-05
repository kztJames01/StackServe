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
  title: "SynthPass",
  description: "Roster & compliance hub for SAG-AFTRA commercial productions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('synthpass-theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'}catch{}` }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${antonio.variable} bg-background font-[family-name:var(--font-geist-mono)] antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}


