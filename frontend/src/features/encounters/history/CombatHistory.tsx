import { History, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ActionRow } from "../../../components/layout";
import {
  Badge,
  Button,
  Callout,
  EmptyState,
  Input,
  MutedPanel,
  Select,
} from "../../../components/ui";
import { api } from "../../../lib/api";
import type { CombatHistoryEntry } from "../../../lib/api/combatHistory";
import { dateLabel, duration, outcomeLabel } from "./combatHistoryDomain";
import "./combatHistory.scss";

export function CombatHistory({
  campaignId,
  onPrepared,
}: {
  campaignId: string;
  onPrepared: () => void;
}) {
  const [q, setQuery] = useState("");
  const [includeTests, setTests] = useState(false);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<{ runs: CombatHistoryEntry[]; total: number } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    const timer = window.setTimeout(() => {
      void api
        .combatHistory(campaignId, { q, includeTests, page, ...(status ? { status } : {}) })
        .then((payload) => {
          if (current) setResult(payload);
        })
        .catch((err: unknown) => {
          if (current)
            setError(err instanceof Error ? err.message : "Could not load combat history");
        })
        .finally(() => {
          if (current) setLoading(false);
        });
    }, 200);
    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [campaignId, q, includeTests, page, status, retry]);
  const empty = !loading && !error && result?.total === 0;
  return (
    <section className="combat-history grid min-w-0 gap-4" aria-label="Combat history">
      <div>
        <h2 className="text-xl font-semibold">Combat history</h2>
        <p className="text-sm text-muted-foreground">
          Saved fights, their results, and time spent taking turns.
        </p>
      </div>
      <ActionRow>
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search combat history</span>
          <Search
            aria-hidden="true"
            className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
          />
          <Input
            type="search"
            className="pl-9"
            placeholder="Search encounters…"
            value={q}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <Select
          ariaLabel="Filter combat status"
          placeholder="All statuses"
          value={status || "all"}
          onValueChange={(value) => {
            setStatus(value === "all" ? "" : value);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All statuses" },
            { value: "completed", label: "Completed" },
            { value: "finished", label: "Awaiting summary" },
          ]}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeTests}
            onChange={(event) => {
              setTests(event.target.checked);
              setPage(1);
            }}
          />
          Include test runs
        </label>
      </ActionRow>
      {error ? (
        <Callout tone="danger">
          {error}{" "}
          <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>
            Retry
          </Button>
        </Callout>
      ) : loading ? (
        <MutedPanel>Loading combat history…</MutedPanel>
      ) : empty ? (
        <div>
          <EmptyState
            icon={History}
            title={q || status ? "No fights match these filters" : "No combats recorded yet"}
            copy={
              q || status
                ? "Try a different encounter name or status."
                : "Finish a combat to save its damage, healing, and turn times here. Test runs are hidden by default."
            }
          />
          <Button className="mt-4" onClick={onPrepared}>
            Go to prepared encounters
          </Button>
        </div>
      ) : (
        <HistoryTable runs={result?.runs ?? []} />
      )}
      {!loading && !error && result && result.total > 0 && (
        <ActionRow justify="between">
          <span className="text-xs text-muted-foreground">
            {result.total} fights · {includeTests ? "Including test runs" : "Test runs excluded"}
          </span>
          <ActionRow>
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm">Page {page}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 20 >= result.total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </ActionRow>
        </ActionRow>
      )}
      <p className="text-xs text-muted-foreground">
        Combat results are recorded automatically. Each run has its own report; opening it leaves
        the combat clock unchanged.
      </p>
    </section>
  );
}

function HistoryTable({ runs }: { runs: CombatHistoryEntry[] }) {
  return (
    <div className="history-table-wrap">
      <table className="history-table">
        <caption className="sr-only">
          Recorded fights, newest first. Damage and healing are party totals including allies.
        </caption>
        <thead>
          <tr>
            <th>Encounter</th>
            <th className="history-optional">Status</th>
            <th className="history-optional number-cell">Damage</th>
            <th className="history-optional number-cell">Healing</th>
            <th className="number-cell">Combat time</th>
            <th>
              <span className="sr-only">Report</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id}>
              <td>
                <Link className="history-report-link" to={`/encounter-runs/${run.id}/report`}>
                  {run.encounterName}
                </Link>
                <small>
                  {dateLabel(run.startedAt)}
                  {run.isTest && " · Test run"}
                </small>
                <span className="history-mobile-status">{outcomeLabel(run.status)}</span>
              </td>
              <td className="history-optional">
                <Badge tone={run.status === "ended" ? "success" : "info"}>
                  {outcomeLabel(run.status)}
                </Badge>
              </td>
              <td className="history-optional number-cell">{run.damageDone}</td>
              <td className="history-optional number-cell">{run.healingDone}</td>
              <td className="number-cell">
                {duration(run.activeTimeMs)}
                <small>{run.rounds} rounds</small>
              </td>
              <td>
                <Link
                  className="history-report-link"
                  aria-label={`Open ${run.encounterName} report`}
                  to={`/encounter-runs/${run.id}/report`}
                >
                  →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
