import { Download, History, List, Swords } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BackButton, Breadcrumbs } from "../../../app/shell";
import { ActionRow } from "../../../components/layout";
import { Badge, Button, Callout, MutedPanel, Page, PageHeader } from "../../../components/ui";
import { api } from "../../../lib/api";
import type { CombatReport } from "../../../lib/api/combatHistory";
import { CombatReportLog } from "./CombatReportLog";
import { CombatReportMetrics } from "./CombatReportMetrics";
import {
  activeTime,
  dateLabel,
  downloadReport,
  duration,
  outcomeLabel,
  partyMember,
  type ReportMetric,
  type ReportSide,
} from "./combatHistoryDomain";
import "./combatHistory.scss";

export function CombatReportPage() {
  const { runID } = useParams();
  const [report, setReport] = useState<CombatReport | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [metric, setMetric] = useState<ReportMetric>("damage");
  const [side, setSide] = useState<ReportSide>("party");
  const [view, setView] = useState<"report" | "log">("report");
  const [round, setRound] = useState<number | null>(null);
  useEffect(() => {
    let current = true;
    setReport(null);
    setError("");
    if (runID)
      void api
        .combatReport(runID)
        .then((payload) => {
          if (current) {
            setReport(payload);
            setView("report");
            setRound(null);
          }
        })
        .catch((err: unknown) => {
          if (current)
            setError(err instanceof Error ? err.message : "Could not load combat report");
        });
    return () => {
      current = false;
    };
  }, [runID, retry]);
  if (error)
    return (
      <Page>
        <Callout tone="danger">{error}</Callout>
        <Button onClick={() => setRetry(retry + 1)}>Retry</Button>
        <Link to="/encounters?tab=history">Back to encounters</Link>
      </Page>
    );
  if (!report) return <MutedPanel>Loading combat report…</MutedPanel>;
  const { run } = report;
  const historyPath = `/campaigns/${report.campaignId}/encounters?tab=history`;
  const party = (run.combatants ?? []).filter(partyMember);
  const time = activeTime(run);
  const finish = run.timing?.combatFinishedAt ?? run.endedAt;
  const paused =
    time !== null && finish && run.timing?.combatStartedAt
      ? Math.max(0, Date.parse(finish) - Date.parse(run.timing.combatStartedAt) - time)
      : null;
  return (
    <Page size="workspace" className="combat-history">
      <BackButton to={historyPath}>All combat history</BackButton>
      <Breadcrumbs
        items={[
          { label: "Encounters", to: historyPath },
          { label: report.encounterName },
          { label: "Combat report" },
        ]}
      />
      <PageHeader
        eyebrow="Combat history"
        title={report.encounterName}
        copy={dateLabel(run.startedAt)}
        action={
          <ActionRow>
            <Button
              variant="outline"
              icon={Download}
              onClick={() => downloadReport(run, report.encounterName)}
            >
              Export CSV
            </Button>
            {run.status !== "ended" && (
              <Link to={`/encounter-runs/${run.id}/summary`}>
                <Button variant="secondary">Review XP and loot</Button>
              </Link>
            )}
          </ActionRow>
        }
      />
      <ActionRow>
        <Badge tone={run.status === "ended" ? "success" : "info"}>{outcomeLabel(run.status)}</Badge>
        {run.isTest && <Badge tone="metadata">Test run</Badge>}
      </ActionRow>
      <dl className="history-metrics">
        <div>
          <dt>Active combat time</dt>
          <dd>{duration(time)}</dd>
          {paused !== null && <small>{duration(paused)} paused · excluded</small>}
        </div>
        <div>
          <dt>Rounds played</dt>
          <dd>{run.currentRound}</dd>
          <small>
            {run.timing?.turns?.filter((turn) => turn.completed).length ?? "Unknown"} completed
            turns
          </small>
        </div>
        <div>
          <dt>Party damage done</dt>
          <dd>{party.reduce((total, person) => total + person.damageDealt, 0)}</dd>
          <small>Includes allies</small>
        </div>
        <div>
          <dt>Party healing done</dt>
          <dd>{party.reduce((total, person) => total + person.healingDone, 0)}</dd>
          <small>HP restored</small>
        </div>
      </dl>
      <ActionRow>
        <Button
          icon={Swords}
          variant={view === "report" ? "primary" : "ghost"}
          aria-pressed={view === "report"}
          onClick={() => setView("report")}
        >
          Fight report
        </Button>
        <Button
          icon={List}
          variant={view === "log" ? "primary" : "ghost"}
          aria-pressed={view === "log"}
          onClick={() => {
            setRound(null);
            setView("log");
          }}
        >
          Round log
        </Button>
        <Link className="ml-auto text-sm underline" to={historyPath}>
          <History className="mr-1 inline h-4 w-4" />
          History
        </Link>
      </ActionRow>
      {view === "report" ? (
        <CombatReportMetrics
          run={run}
          metric={metric}
          side={side}
          onMetric={setMetric}
          onSide={setSide}
          onRound={(value) => {
            setRound(value);
            setView("log");
          }}
        />
      ) : (
        <CombatReportLog key={round ?? "all"} run={run} initialRound={round} />
      )}
    </Page>
  );
}
