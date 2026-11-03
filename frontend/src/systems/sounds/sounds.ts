import { play, set, type CueName } from "@foleyjs/core";
import type { Settings } from "@/features/settings/types";
export type SoundPreferences = Pick<Settings,"sounds_enabled"|"sound_ui"|"sound_notifications"|"sound_volume"|"sound_theme">;
let settings:SoundPreferences={sounds_enabled:false};
let previewTimer:ReturnType<typeof setTimeout>|undefined;
function apply() { set({muted:!settings.sounds_enabled,volume:(settings.sound_volume??25)/100,theme:settings.sound_theme??"soft",hover:false}); }
export function configureSounds(next:SoundPreferences) {clearTimeout(previewTimer);settings=next;apply();}
export function playSound(cue:CueName, channel:"ui"|"notification"="ui") {
  if (!settings.sounds_enabled || (channel==="ui" ? settings.sound_ui===false : settings.sound_notifications===false)) return;
  try {play(cue);} catch { /* Sound availability must never block an action. */ }
}
export function previewSound(next:SoundPreferences) {
  if(!next.sounds_enabled)return;
  clearTimeout(previewTimer);
  try {set({muted:false,volume:(next.sound_volume??25)/100,theme:next.sound_theme??"soft"});play("success");} catch { /* Unsupported or locked audio stays silent. */ }
  previewTimer=setTimeout(apply,1000);
}

export function playTaskResult(status:string){if(status==="completed")playSound("success");else if(status==="rejected"||status==="todo")playSound("bubble");}
