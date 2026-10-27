import { createContext, useContext } from "react";
import type { Settings } from "./types";

export const PreferencesContext = createContext<{ settings: Settings; updateSettings: (settings: Settings) => void } | null>(null);

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("PreferencesProvider is missing");
  return context;
}
