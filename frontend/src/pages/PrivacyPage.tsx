import { Page, PageHeader, SectionPanel } from "../components/ui";
import { ShieldCheck } from "lucide-react";

export function PrivacyPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Privacy"
        title="Privacy and data storage"
        copy="bluDM is built for self-hosting. The person operating the server controls where data is stored, who can reach the app, and how backups are handled."
      />
      <SectionPanel title="What bluDM stores" icon={ShieldCheck}>
        <div className="grid max-w-3xl gap-3 text-sm leading-6 text-muted-foreground">
          <p>
            bluDM stores the account email returned by your configured sign-in provider, the
            provider identifier needed to recognize future logins, server-side sessions, campaign
            content, character sheets, creatures, spells, actions, encounters, combat logs, and any
            images you upload or import.
          </p>
          <p>
            bluDM does not need to store Google or Discord access tokens or refresh tokens. Uploaded
            images and game data are private to the signed-in user that created them unless a future
            sharing feature explicitly grants access.
          </p>
          <p>
            For production use, serve bluDM over HTTPS, set secure cookies, keep database backups
            protected, and rotate OAuth credentials if they are exposed.
          </p>
        </div>
      </SectionPanel>
    </Page>
  );
}
