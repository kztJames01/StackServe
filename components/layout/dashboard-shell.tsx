"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type DashboardShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function DashboardShell({ title, description, children }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-screen bg-[#faf9f7]">
        <header className="sticky top-0 z-20 flex min-h-16 items-center border-b border-[#e8dcc7]/60 bg-white/80 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="-ml-1 hover:bg-[#f8f5f0]" />
            <Separator orientation="vertical" className="h-4 bg-[#e8dcc7]" />
            <Link href="/explore" className="text-xs font-medium uppercase tracking-wider text-[#8a7f72] hover:text-[#bb9457] transition-colors font-[family-name:var(--font-geist-sans)]">
              Workspace
            </Link>
            <span className="text-sm text-[#d4c8b8]">/</span>
            <span className="truncate text-sm font-semibold text-[#252422] font-[family-name:var(--font-geist-sans)]">{title}</span>
          </div>
        </header>
        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <div>
            <h1 className="text-3xl font-semibold text-[#252422] sm:text-4xl font-[family-name:var(--font-antonio)] tracking-tight">{title}</h1>
            {description ? (
              <p className="mt-2 max-w-3xl text-sm text-[#8a7f72] font-[family-name:var(--font-geist-sans)]">
                {description}
              </p>
            ) : null}
          </div>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function CardSection({
  children,
  tone = "white",
}: {
  children: ReactNode;
  tone?: "white" | "brown" | "black";
}) {
  const toneClass =
    tone === "brown"
      ? "bg-gradient-to-br from-[#c9a86c] to-[#bb9457] text-[#252422] shadow-lg shadow-[#bb9457]/20"
      : tone === "black"
        ? "bg-gradient-to-br from-[#2d2c2a] to-[#252422] text-[#F5EFE6] shadow-lg shadow-[#252422]/20"
        : "bg-white text-[#252422] shadow-sm shadow-[#252422]/5 border border-[#e8dcc7]/60";

  return <section className={`rounded-2xl p-5 sm:p-6 ${toneClass}`}>{children}</section>;
}
