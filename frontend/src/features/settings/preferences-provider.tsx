import { useEffect, useState, type ReactNode } from "react";
import { PreferencesContext } from "./preferences-context";
import type { Settings } from "./types";

export function PreferencesProvider({ initial, children }: { initial: Settings; children: ReactNode }) {
  const [settings, updateSettings] = useState(initial);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => { document.documentElement.dataset.theme = settings.theme === "system" ? media.matches ? "dark" : "light" : settings.theme; };
    apply(); media.addEventListener("change", apply);
    return () => { media.removeEventListener("change", apply); delete document.documentElement.dataset.theme; };
  }, [settings.theme]);
  return <PreferencesContext value={{ settings, updateSettings }}>{children}</PreferencesContext>;
}
