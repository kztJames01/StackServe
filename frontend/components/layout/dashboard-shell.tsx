"use client";

import { ThemeToggle } from "@/components/theme-provider";
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
  workspaceHome?: boolean;
};

export function DashboardShell({ title, description, children, workspaceHome = false }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-h-screen min-w-0 bg-background">
        <header className="sticky top-0 z-20 flex min-h-16 items-center border-b border-border/60 bg-card/80 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="-ml-1 hover:bg-muted" />
            <Separator orientation="vertical" className="h-4 bg-border" />
            <Link href="/dashboard" className="text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors font-[family-name:var(--font-geist-sans)]">
              Workspace
            </Link>
            {!workspaceHome && (
              <>
                <span className="text-sm text-muted-foreground">/</span>
                <span className="truncate text-sm font-semibold text-foreground font-[family-name:var(--font-geist-sans)]">{title}</span>
              </>
            )}
          </div>
          <div className="ml-auto pl-3"><ThemeToggle /></div>
        </header>
        <main className="space-y-6 p-4 sm:p-6 lg:p-8">
          <div>
            <h1 className="text-3xl font-semibold text-foreground sm:text-4xl font-[family-name:var(--font-antonio)] tracking-tight">{title}</h1>
            {description ? (
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground font-[family-name:var(--font-geist-sans)]">
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
      ? "bg-accent text-accent-foreground border border-border"
      : tone === "black"
        ? "bg-secondary text-secondary-foreground border border-border"
        : "bg-card text-card-foreground border border-border shadow-sm";

  return <section className={`rounded-2xl p-5 sm:p-6 ${toneClass}`}>{children}</section>;
}
