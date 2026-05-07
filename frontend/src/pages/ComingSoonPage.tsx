import React from "react";
import { EmptyState, Page, PageHeader } from "../components/ui";

export function ComingSoonPage({ icon: Icon, title, copy }: { icon: React.ElementType; title: string; copy: string }) {
  return (
    <Page>
      <PageHeader eyebrow="Workspace" title={title} copy={copy} />
      <EmptyState icon={Icon} title={`${title} coming next`} copy={copy} />
    </Page>
  );
}
