import { HelpArticle } from "@/components/help/article"
import { LegalMarkdown, readLegalDoc } from "@/components/help/legal-markdown"

export default function PrivacyPolicyPage() {
  return (
    <HelpArticle
      title="Privacy Policy"
      description="How SynthPass collects, uses, and protects personal, likeness, and provenance data. Effective October 4, 2026."
    >
      <LegalMarkdown source={readLegalDoc("SynthPass - Enterprise Privacy Policy (privacy_policy.md).md")} />
    </HelpArticle>
  )
}
