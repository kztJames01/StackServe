import { HelpArticle, HelpSection } from "@/components/help/article"

const vendors = [
  ["Google Firebase / Google Cloud", "Sign-in and identity tokens", "Account email, name, auth metadata"],
  ["Stripe", "Payments and subscriptions", "Billing contact and transaction metadata. Full card numbers are not stored here."],
  ["Backblaze B2", "File storage", "Avatars, shoot media, stamped license PDFs"],
  ["Application host and Postgres", "App and database", "Workspace data. Region is set with the host."],
  ["Redis", "Rate limiting and realtime", "Short-lived request and session data"],
  ["Sentry", "Error monitoring", "Error traces and truncated request context"],
  ["Arcjet", "Security and rate limiting", "Request metadata and IP address"],
  ["Transactional email", "Alerts and digests", "Email address and the alert itself"],
]

export default function PrivacyCenterPage() {
  return (
    <HelpArticle
      title="Privacy Center"
      description="Who controls workspace data, what you can ask for, and which vendors process it."
    >
      <p className="text-muted-foreground">
        The full policy is the <a className="underline" href="/help/privacy-policy">SynthPass Privacy Policy</a>. This page is the shorter operational summary for workspace admins.
      </p>
      <HelpSection title="Two roles">
        <p>For your own account, billing, and product usage, SynthPass is the controller.</p>
        <p>For performer profiles, availability, shoot records, and media metadata an agency puts in its workspace, the agency is the controller and SynthPass is the processor. A performer with a question about that workspace should contact the agency.</p>
      </HelpSection>
      <HelpSection title="Your rights">
        <p>Depending on where you live, you can ask to access, correct, delete, or export personal data, restrict or object to some processing, and withdraw consent. California residents can also ask to know, delete, and correct data, and to opt out of sale or sharing. SynthPass does not sell personal data and does not share it for cross-context advertising.</p>
        <p>Use the export and deletion tools on Account, or email privacy@synthpass.com. Requests are verified. The response window is 30 days under GDPR and 45 days under the CCPA. You can also complain to your supervisory authority.</p>
      </HelpSection>
      <HelpSection title="Cookies">
        <p>Strictly necessary cookies keep you signed in and protect the session. They last from the session up to about 14 days and cannot be turned off.</p>
        <p>Preference cookies remember theme, sidebar state, and dismissed checklists for up to 12 months.</p>
        <p>Optional analytics load only after you accept them. There are no advertising cookies at launch.</p>
      </HelpSection>
      <HelpSection title="Vendors">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-foreground">
                <th className="py-2 pr-4 font-medium">Vendor</th>
                <th className="py-2 pr-4 font-medium">Job</th>
                <th className="py-2 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((row) => (
                <tr key={row[0]} className="border-b border-border/70 align-top">
                  <td className="py-3 pr-4 text-foreground">{row[0]}</td>
                  <td className="py-3 pr-4">{row[1]}</td>
                  <td className="py-3">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Each vendor is contracted to process data only on instruction. EU, UK, and EEA transfers rely on Standard Contractual Clauses, the UK Addendum, or the EU-US Data Privacy Framework where the vendor participates.</p>
      </HelpSection>
      <HelpSection title="If something goes wrong">
        <p>SynthPass notifies affected customers of a personal-data breach without undue delay. Where it is the controller and the law requires it, authorities are notified within 72 hours. Where it is the processor, the agency is notified so the agency can meet its own duties.</p>
        <p>The full policy is on the Privacy Policy page. The service is not for anyone under 18.</p>
      </HelpSection>
    </HelpArticle>
  )
}
