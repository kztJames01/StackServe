'use client'

import Image from "next/image";
import FallingmodelsWithTextures from "@/components/cube";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <div>
        {/* Animation Container (Left 50%) */}
        <FallingmodelsWithTextures />

        {/* Content Container (Left 50%) */}
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center w-full lg:w-[50%] min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
          <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
            <div className="flex flex-col items-center justify-center text-center bg-white/10 backdrop-blur-sm p-8 rounded-lg shadow-lg max-w-xl mx-auto">
              <div className="flex items-center gap-4">
                <Image
                  src="/logo/mobile-logo1.png"
                  alt="Logo"
                  width={70}
                  height={70}
                />
                <h1 className="text-3xl font-[family-name:var(--font-antonio)]">
                  NxtGen
                </h1>
              </div>
              <p className="text-lg text-primary m-8">
                A global creator hub for students, and innovators to share ideas, collaborate on projects, and turn dreams into reality.
              </p>
              <div className="flex gap-4">
                <Link
                  href="/sign-up"
                  className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-secondary transition-colors"
                >
                  Join the Community
                </Link>
                <Link
                  href="/explore"
                  className="bg-transparent border border-primary text-primary px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
                >
                  Explore Projects
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
        className="fixed top-0 right-0 w-[50%] h-full hidden lg:block"
      />
    </>
  );
}