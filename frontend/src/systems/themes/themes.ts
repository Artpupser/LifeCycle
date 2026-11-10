import themeCss from "@/assets/theme.css?raw";
import { t } from "@/systems/i18n/locale";
export type ThemeColors = {background:string;foreground:string;card:string;primary:string;primary_foreground:string;muted:string;muted_foreground:string;border:string;destructive:string};
// Palette values have one owner: the CSS entry used by both UI and editor.
const palette=(name:string):ThemeColors=>{
 const block=themeCss.split(`/* palette:${name} */`)[1]?.split("}")[0]??"";
 return Object.fromEntries([...block.matchAll(/--([a-z-]+):\s*(#[\da-f]{6});/g)].map(([,key,value])=>[key.replaceAll("-","_"),value])) as ThemeColors;
};
export const themes={light:palette("light"),sand:palette("sand"),dark:palette("dark"),ocean:palette("ocean"),forest:palette("forest"),dusk:palette("dusk")};
export type ThemeName = "system" | keyof typeof themes | "custom";
export const themeLabels: Record<ThemeName,string> = {get system() { return t("Как в системе"); },get light() { return t("Светлая"); },get dark() { return t("Тёмная"); },get ocean() { return t("Океан"); },get forest() { return t("Лес"); },get dusk() { return t("Сумерки"); },get sand() { return t("Песок"); },get custom() { return t("Своя тема"); }};
export function contrast(a:string,b:string) {
  const luminance=(color:string)=>{const rgb=[1,3,5].map(index=>parseInt(color.slice(index,index+2),16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
  const first=luminance(a),second=luminance(b);return (Math.max(first,second)+.05)/(Math.min(first,second)+.05);
}
const contrastDark=themeCss.match(/--contrast-dark:\s*(#[\da-f]{6});/)?.[1]??themes.light.foreground;
const contrastLight=themeCss.match(/--contrast-light:\s*(#[\da-f]{6});/)?.[1]??themes.dark.foreground;
export function readableText(background:string) { return contrast(background,contrastLight)>=contrast(background,contrastDark) ? contrastLight : contrastDark; }
export function isDarkTheme(colors:ThemeColors){return contrast(colors.background,contrastLight)>contrast(colors.background,contrastDark);}
export function validTheme(colors:ThemeColors) { return Object.values(colors).every(color=>/^#[\da-f]{6}$/i.test(color)) && contrast(colors.background,colors.foreground)>=4.5 && contrast(colors.card,colors.foreground)>=4.5 && contrast(colors.primary,colors.primary_foreground)>=4.5; }
export function themeStyle(colors:ThemeColors) { return Object.fromEntries(Object.entries(colors).map(([key,value])=>[`--${key.replace(/_/g,"-")}`,value])); }

/** Stored object colors and contrast helpers share the theme token source. */
export const contentColors=[...themeCss.matchAll(/--content-color-\d:\s*(#[\da-f]{6});/g)].map(([,value])=>value);
export const defaultItemColor=themes.light.primary;
