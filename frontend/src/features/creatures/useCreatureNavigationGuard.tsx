import { useCallback, useRef } from "react";
import { useBeforeUnload, useBlocker } from "react-router-dom";
import { ConfirmDialog } from "../../components/ui";

export function useCreatureNavigationGuard(dirty: boolean) {
  const allow = useRef(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      !allow.current &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  );
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (!dirty || allow.current) return;
        event.preventDefault();
        event.returnValue = "";
      },
      [dirty],
    ),
  );
  return {
    allowNavigation: () => {
      allow.current = true;
    },
    dialog: (
      <ConfirmDialog
        open={blocker.state === "blocked"}
        title="Discard unsaved changes?"
        confirmLabel="Discard and leave"
        onCancel={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      >
        Your changes to this creature have not been saved.
      </ConfirmDialog>
    ),
  };
}
