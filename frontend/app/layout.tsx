import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Antonio } from "next/font/google";
import "./globals.css";
import Head from "next/head";


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
  variable: "--font-antonio", // Define a CSS variable for Antonio
  weight: "400", // Default weight
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
      <Head>
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Antonio:wght@100..700&display=swap"
          as="style"
        />
      </Head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${antonio.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
