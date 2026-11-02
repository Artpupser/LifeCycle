import { useContext } from "react";
import { PreferencesContext } from "@/features/settings/preferences-context";
import { UserImage } from "@/systems/media/user-image";
export function ThemeBackground() {
  const settings=useContext(PreferencesContext)?.settings;
  if(!settings?.background_image)return null;
  return <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true"><UserImage src={settings.background_image} alt="" className="h-full w-full object-cover" loading="eager"/><div className="absolute inset-0 bg-background" style={{opacity:(settings.background_dim??85)/100}}/></div>;
}
