import { configureAnimations } from "@/systems/animations/policy";
import { configureEffects } from "@/systems/effects/events";
import { themes, themeStyle, readableText } from "@/systems/themes/themes";
import { notify } from "@/lib/feedback";
import { t } from "@/systems/i18n/locale";
import { setLanguage } from "@/systems/i18n/locale";
import { SoundProvider } from "@/systems/sounds/sound-provider";
import { useEffect, useState, type ReactNode } from "react";
import { PreferencesContext } from "./preferences-context";
import type { Settings } from "./types";

export function PreferencesProvider({ initial, children }: { initial: Settings; children: ReactNode }) {
  const [saved, setSaved] = useState<{ source: Settings; value: Settings } | null>(null);
  const settings = saved?.source === initial ? saved.value : initial;
  const updateSettings = (value: Settings) => setSaved({ source: initial, value });
  useEffect(()=>{configureAnimations(settings.animations_enabled!==false);configureEffects(settings.effects_enabled!==false);return()=>{configureAnimations(true);configureEffects(false);};},[settings.animations_enabled,settings.effects_enabled]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const root=document.documentElement;
    const apply = () => {
      const selected=settings.theme === "system" ? media.matches ? "dark" : "light" : settings.theme;
      const colors=selected==="custom" ? settings.custom_theme??themes.light : themes[selected]??themes.light;
      root.dataset.theme=selected;
      Object.entries(themeStyle(colors)).forEach(([key,value])=>root.style.setProperty(key,value));
      root.style.colorScheme=readableText(colors.background)==="#ffffff"?"dark":"light";
    };
    apply(); media.addEventListener("change", apply);
    return () => { media.removeEventListener("change", apply); delete root.dataset.theme; Object.keys(themeStyle(themes.light)).forEach(key=>root.style.removeProperty(key)); root.style.removeProperty("color-scheme"); };
  }, [settings.theme,settings.custom_theme]);
  useEffect(()=>{void setLanguage(settings.language).catch(()=>notify(t("Не удалось загрузить язык. Обновите страницу и повторите выбор."),"error"));},[settings.language]);
  return <PreferencesContext value={{ settings, updateSettings }}><SoundProvider preferences={settings}>{children}</SoundProvider></PreferencesContext>;
}
