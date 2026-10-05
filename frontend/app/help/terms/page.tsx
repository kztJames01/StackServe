import { HelpArticle } from "@/components/help/article"
import { LegalMarkdown, readLegalDoc } from "@/components/help/legal-markdown"

export default function TermsPage() {
  return (
    <HelpArticle
      title="Terms of Service"
      description="SaaS subscription and compliance platform agreement. Effective October 4, 2026."
    >
      <LegalMarkdown source={readLegalDoc("SynthPass - Enterprise Terms of Service (terms_of_service.md).md")} />
    </HelpArticle>
  )
}
