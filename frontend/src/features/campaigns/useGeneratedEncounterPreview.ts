import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { emptyEncounterPreview } from "./encounterBuilderDialogState";
import type {
  EncounterBuilderMode,
  EncounterBuilderRandomOptions,
} from "./encounterBuilderGenerator";

export function useGeneratedEncounterPreview({
  campaignId,
  locationId,
  mode,
  open,
  options,
  playerIds,
}: {
  campaignId: string;
  locationId: string;
  mode: EncounterBuilderMode | null;
  open: boolean;
  options: EncounterBuilderRandomOptions;
  playerIds: string[];
}) {
  const [roll, setRoll] = useState(1);
  const [preview, setPreview] = useState(emptyEncounterPreview);
  const [fingerprint, setFingerprint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = useCallback(() => {
    setRoll(1);
    setPreview(emptyEncounterPreview);
    setFingerprint("");
    setLoading(false);
    setError("");
  }, []);

  useEffect(() => {
    if (!open || mode !== "random") return;
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .previewGeneratedEncounter(campaignId, {
        options,
        playerIds,
        locationId,
        roll,
      })
      .then(({ preview: result, previewFingerprint }) => {
        if (!cancelled) {
          setPreview(result);
          setFingerprint(previewFingerprint);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not generate encounter preview");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignId, locationId, mode, open, options, playerIds, roll]);

  return {
    preview,
    fingerprint,
    loading,
    error,
    reset,
    clearError: () => setError(""),
    regenerate: () => setRoll((current) => current + 1),
  };
}
