'use client'

import Image from "next/image";
import FallingmodelsWithTextures from "@/components/Logo3D";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-provider";

export default function Home() {
  return (
    <>
      <div className="fixed left-4 top-4 z-30 rounded-full border bg-card"><ThemeToggle /></div>
      <div>
        {/* Animation Container (Left 50%) */}
        <FallingmodelsWithTextures />

        {/* Content Container (Left 50%) */}
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center w-full lg:w-[50%] min-h-screen p-4 pb-16 gap-10 sm:p-12 sm:gap-16 lg:p-20 font-[family-name:var(--font-geist-sans)]">
          <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
            <div className="flex flex-col items-center justify-center text-center bg-card/85 backdrop-blur-md border border-border p-6 sm:p-10 rounded-2xl shadow-lg max-w-xl mx-auto">
              <div className="flex items-center gap-4">
                <Image
                  src="/logo/mobile-logo1.png"
                  alt="Logo"
                  width={70}
                  height={70}
                  className="size-12 sm:size-[70px]"
                />
                <h1 className="text-2xl sm:text-3xl font-[family-name:var(--font-antonio)]">
                  StudioPass
                </h1>
              </div>
              <p className="text-base sm:text-lg text-primary my-6 sm:m-8">
                The roster & compliance hub for freelance creative teams. Assemble shoots, track crew availability, and prove usage-rights on every delivered image.
              </p>
              <div className="flex w-full flex-col items-stretch gap-4 sm:w-auto sm:flex-row">
                <Link
                  href="/sign-up"
                  className="text-center bg-secondary text-secondary-foreground px-8 py-3.5 rounded-xl font-semibold hover:bg-secondary/90 hover:shadow-lg hover:shadow-[#252422]/20 hover:-translate-y-0.5 transition-all duration-300"
                >
                  Start Free Workspace
                </Link>
                <Link
                  href="/sign-in"
                  className="text-center bg-card/80 backdrop-blur-sm border border-[#252422]/20 text-foreground px-8 py-3.5 rounded-xl font-semibold hover:bg-card hover:border-[#252422]/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </main>
          <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
            <a
              className="flex items-center gap-2 hover:underline hover:underline-offset-4"
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                aria-hidden
                src="/file.svg"
                alt="File icon"
                width={16}
                height={16}
              />
              About us
            </a>
            <a
              className="flex items-center gap-2 hover:underline hover:underline-offset-4"
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                aria-hidden
                src="/window.svg"
                alt="Window icon"
                width={16}
                height={16}
              />
              Source Code
            </a>
            <a
              className="flex items-center gap-2 hover:underline hover:underline-offset-4"
              href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                aria-hidden
                src="/globe.svg"
                alt="Globe icon"
                width={16}
                height={16}
              />
              Explore and Connect →
            </a>
          </footer>
        </div>
      </div>

      {/* Image Container (Right 50%) */}
      <Image
        src="/home.jpg"
        alt="home"
        width={500}
        height={500}
        className="fixed top-0 right-0 w-[50%] h-full object-cover hidden lg:block"
      />
    </>
  );
}

