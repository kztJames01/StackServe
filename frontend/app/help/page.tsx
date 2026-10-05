import { HelpArticle, HelpSection } from "@/components/help/article"

const faqs = [
  {
    q: "What is SynthPass?",
    a: "An agency workspace for commercial shoots and AI media compliance. Teams manage performer rosters, workspace roles, SAG-AFTRA rate cards, and cryptographic media asset records.",
  },
  {
    q: "Is SynthPass a law firm or a talent agency?",
    a: "No. SynthPass is not a law firm, talent agency, employer, or party to an agreement between an agency and a performer. Workspace records and media hashes document information supplied by the parties. They are not legal advice.",
  },
  {
    q: "Who can open an account?",
    a: "You must be at least 18 and able to form a binding contract. If you use SynthPass for a company, you represent that you can bind that company. You are responsible for activity under your account, including producers, clearance counsel, performers, and agents you invite.",
  },
  {
    q: "What do the plans cost?",
    a: "The current terms list Agency Pro at $499 per month and Enterprise at $2,499 per month, plus any per-seat or per-cleared-asset overages shown at checkout. Prices exclude taxes. Subscriptions renew through Stripe until cancelled.",
  },
  {
    q: "What happens if I cancel or a payment fails?",
    a: "Cancel any time in the billing portal. Cancellation takes effect at the end of the current period. Partial-period refunds are not offered except where the law requires them. If a payment fails, paid features may be suspended after notice. License records are not deleted solely because of non-payment. On a downgrade they stay readable for the retention window described in the Terms.",
  },
  {
    q: "Who owns the files and license records?",
    a: "You own the data, files, images, and text you or your invitees submit. SynthPass only hosts and processes that data to run the service. Performers retain their rights. An agency should not export or reuse performer data beyond an authorized engagement.",
  },
  {
    q: "Are typed-name signatures binding?",
    a: "The signing step asks for consent to sign electronically, keep the document as a PDF, and store the typed name, timestamp, and technical metadata as evidence. That record is intended to meet the U.S. ESIGN Act and UETA, and to count as a simple electronic signature under eIDAS. Some places or deal types need a stronger signature. You have to confirm that a typed name is enough for your job.",
  },
  {
    q: "What personal data do you collect?",
    a: "Account data, billing data, workspace membership, performer roster and availability, shoot records, media metadata and hashes, logs, error reports, and cookies. Card numbers stay with Stripe. SynthPass does not sell personal data.",
  },
  {
    q: "How long is data kept?",
    a: "Account data is kept for the life of the account plus 90 days after it ends. Signed license records and signature metadata may be archived or pseudonymized for up to 7 years because they can be evidence in a rights dispute. Logs are kept about 90 days. Backups expire within 35 days.",
  },
  {
    q: "How do I use my privacy rights?",
    a: "Depending on where you live (GDPR, UK GDPR, CCPA/CPRA, and similar laws) you can ask for access, correction, deletion, portability, restriction, or objection, and you can withdraw consent. Use the tools on Account, or the contact published in the Privacy Policy once it is filled in. Requests are verified and answered within 30 days under GDPR or 45 days under CCPA.",
  },
  {
    q: "What can I not do in the product?",
    a: "Do not upload media you have no right to use, sign a license for someone else without authority, scrape or bypass seat and rate limits, send spam in crew chat, resell a roster, or store government IDs, health records, or card numbers outside Stripe. Abuse can lead to a warning, suspension, or removal.",
  },
]

export default function HelpCenterPage() {
  return (
    <HelpArticle
      title="Help Center"
      description="Answers drawn from the SynthPass terms, privacy policy, and acceptable use rules."
    >
      <p className="text-muted-foreground">
        These answers follow the legal pack. They are a guide to the product, not legal advice, and they do not create an attorney-client relationship.
      </p>
      {faqs.map((item) => (
        <HelpSection key={item.q} title={item.q}>
          <p>{item.a}</p>
        </HelpSection>
      ))}
    </HelpArticle>
  )
}
