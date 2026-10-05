import { HelpArticle, HelpSection } from "@/components/help/article"

export default function ReleaseNotesPage() {
  return (
    <HelpArticle
      title="Release Notes"
      description="What is in the SynthPass workspace today."
    >
      <HelpSection title="October 2026 — SynthPass Sprints 0–2">
        <ul className="list-disc space-y-2 pl-5">
          <li>Agency workspaces now enforce Admin, Producer, Clearance Counsel, and Performer / Agent roles.</li>
          <li>Performer roster, member invitations, and SAG-AFTRA commercial rate cards are connected to each workspace.</li>
          <li>Commercial shoots support direct AI video uploads with client-side SHA-256 hashing and B2 verification.</li>
          <li>Booking crew on a shoot writes a hold on the availability calendar. Overlapping bookings show as a conflict.</li>
          <li>Usage-rights licenses move from draft to sent to signed. Signing is a typed name, stamped onto a one-page PDF.</li>
          <li>The compliance page flags a delivered shoot with no signed license, a license expiring within 30 days, and crew on a call sheet with no license row.</li>
          <li>Billing is per seat. Free includes 3 seats. Agency and Studio are paid plans. Studio can export a CSV of licenses.</li>
        </ul>
      </HelpSection>
      <HelpSection title="Not in this release">
        <p>A third-party e-sign vendor, a client-facing rights link, cross-agency availability, and invoicing are not in the product yet.</p>
      </HelpSection>
    </HelpArticle>
  )
}
