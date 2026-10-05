import { ReactNode } from "react"
import { CardSection, DashboardShell } from "@/components/layout/dashboard-shell"

export function HelpArticle({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <DashboardShell title={title} description={description}>
      <CardSection tone="white">
        <article className="max-w-3xl space-y-8 text-sm leading-relaxed">
          {children}
        </article>
      </CardSection>
    </DashboardShell>
  )
}

export function HelpSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-muted-foreground">{children}</div>
    </section>
  )
}
