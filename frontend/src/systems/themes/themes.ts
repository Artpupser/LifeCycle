import { t } from "@/systems/i18n/locale";
export type ThemeColors = {background:string;foreground:string;card:string;primary:string;primary_foreground:string;muted:string;muted_foreground:string;border:string;destructive:string};
export const themes = {
  light:{background:"#f4f6f0",foreground:"#182319",card:"#ffffff",primary:"#3d6e14",primary_foreground:"#ffffff",muted:"#e8ede1",muted_foreground:"#5c6a5a",border:"#d7dfd0",destructive:"#b42332"},
  dark:{background:"#111612",foreground:"#f0f3ed",card:"#191f1a",primary:"#a3e635",primary_foreground:"#172314",muted:"#252e26",muted_foreground:"#a0ada2",border:"#303a31",destructive:"#fca5a5"},
  ocean:{background:"#0b1929",foreground:"#e2efff",card:"#12263c",primary:"#68d7eb",primary_foreground:"#09212b",muted:"#203b51",muted_foreground:"#a1bbd2",border:"#2b485e",destructive:"#fda4af"},
  forest:{background:"#10231e",foreground:"#ecf5ea",card:"#18342a",primary:"#94dfb1",primary_foreground:"#10291d",muted:"#254438",muted_foreground:"#b0c9b8",border:"#3e5d4f",destructive:"#fda4af"},
  dusk:{background:"#1d172b",foreground:"#f5efff",card:"#2b223e",primary:"#c8b0ff",primary_foreground:"#251740",muted:"#3b2e52",muted_foreground:"#c4b3dc",border:"#554269",destructive:"#fda4af"},
  rose:{background:"#fbf2f3",foreground:"#3c2028",card:"#fffafb",primary:"#a72f59",primary_foreground:"#ffffff",muted:"#f4e1e6",muted_foreground:"#77515e",border:"#e6cbd3",destructive:"#b42332"},
  sand:{background:"#f7f2e8",foreground:"#362e23",card:"#fffdf8",primary:"#855b19",primary_foreground:"#ffffff",muted:"#ece2d1",muted_foreground:"#71614e",border:"#d9cbb6",destructive:"#b42332"},
} satisfies Record<string,ThemeColors>;
export type ThemeName = "system" | keyof typeof themes | "custom";
export const themeLabels: Record<ThemeName,string> = {get system() { return t("Как в системе"); },get light() { return t("Светлая"); },get dark() { return t("Тёмная"); },get ocean() { return t("Океан"); },get forest() { return t("Лес"); },get dusk() { return t("Сумерки"); },get rose() { return t("Роза"); },get sand() { return t("Песок"); },get custom() { return t("Своя тема"); }};
export function contrast(a:string,b:string) {
  const luminance=(color:string)=>{const rgb=[1,3,5].map(index=>parseInt(color.slice(index,index+2),16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
  const first=luminance(a),second=luminance(b);return (Math.max(first,second)+.05)/(Math.min(first,second)+.05);
}
export function readableText(background:string) { return contrast(background,"#ffffff")>=contrast(background,"#172314") ? "#ffffff" : "#172314"; }
export function validTheme(colors:ThemeColors) { return Object.values(colors).every(color=>/^#[\da-f]{6}$/i.test(color)) && contrast(colors.background,colors.foreground)>=4.5 && contrast(colors.card,colors.foreground)>=4.5 && contrast(colors.primary,colors.primary_foreground)>=4.5; }
export function themeStyle(colors:ThemeColors) { return Object.fromEntries(Object.entries(colors).map(([key,value])=>[`--${key.replace(/_/g,"-")}`,value])); }
