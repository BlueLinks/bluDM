import { createContext, useContext, type ReactNode } from "react";

export type UiDensity = "auto" | "compact" | "comfy";

const UiDensityContext = createContext<{
  density: UiDensity;
  onDensityChange: (density: UiDensity) => void;
} | null>(null);

export function UiDensityProvider({
  children,
  density,
  onDensityChange,
}: {
  children: ReactNode;
  density: UiDensity;
  onDensityChange: (density: UiDensity) => void;
}) {
  return (
    <UiDensityContext.Provider value={{ density, onDensityChange }}>
      {children}
    </UiDensityContext.Provider>
  );
}

export function useUiDensity() {
  const value = useContext(UiDensityContext);
  if (!value) throw new Error("useUiDensity must be used within WorkspaceShell");
  return value;
}
