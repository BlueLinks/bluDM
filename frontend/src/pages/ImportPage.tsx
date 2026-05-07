import { Import, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Callout, Page, PageHeader, SectionPanel, ToastViewport, useToasts } from "../components/ui";

export function ImportPage({
  seedTestData
}: {
  seedTestData: () => Promise<{ campaignId: string; message: string }>;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [seeding, setSeeding] = useState(false);
  const navigate = useNavigate();
  const toast = useToasts();

  async function seedDemo() {
    setSeeding(true);
    setError("");
    setMessage("");
    try {
      const payload = await seedTestData();
      setMessage(payload.message);
      toast.push("Demo test data added");
      void navigate(`/campaigns/${payload.campaignId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not seed test data");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <Page>
      <ToastViewport toasts={toast.toasts} />
      <PageHeader
        eyebrow="Import"
        title="Import and demo data"
        copy="App-native JSON imports will live here. For development, seed a ready-made campaign with players, friendlies, enemies, and reusable actions."
      />
      {message && <Callout>{message}</Callout>}
      {error && <Callout tone="danger">{error}</Callout>}
      <SectionPanel title="Demo Fixture" icon={Import}>
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h3 className="font-semibold">Greenhill Ambush</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Adds three player characters, two friendly NPCs, several enemies, weapon and spell-like action templates, and a prepared encounter.
            </p>
          </div>
          <Button type="button" icon={Plus} variant="success" disabled={seeding} onClick={() => void seedDemo()}>
            {seeding ? "Seeding..." : "Seed test data"}
          </Button>
        </div>
      </SectionPanel>
    </Page>
  );
}
