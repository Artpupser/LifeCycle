import {currencyMarks} from "./currencies";
import {operatorMarks} from "./operators";
import type { IconifyIcon } from "@iconify/react/offline";
import ui from "./ui-data.json";
import manifest from "./manifest.json";
import brandSvg from "@/assets/logo.svg?raw";

export type IconPack = "tabler" | "circle-flags" | "simple-icons" | "twemoji" | "lifecycle";
export type IconEntry = { id: string; name: string; pack: IconPack };
const data = new Map<string, IconifyIcon>();
const subscribers = new Set<() => void>();
let version = 0;
function register(pack: IconPack, icons: Record<string, IconifyIcon>, width = 24, height = 24) {
  Object.entries(icons).forEach(([name, icon]) => data.set(`${pack}:${name}`, {width, height, ...icon}));
  version++; subscribers.forEach(listener => listener());
}
register("tabler", ui.icons, ui.width, ui.height);
register("lifecycle",{...operatorMarks,...currencyMarks});
const brandBody=brandSvg.replace(/^.*?<svg[^>]*>/s, "").replace(/<\/svg>\s*$/, "");
const brandFill=brandSvg.match(/<svg[^>]*\bfill="([^"]*)"/)?.[1]??"currentColor";
register("lifecycle", {mark:{width:48,height:48,body:`<g fill="${brandFill}">${brandBody}</g>`}});
export const iconCatalog: IconEntry[] = [
  {id:"lifecycle:mark",name:"LifeCycle",pack:"lifecycle"},
  ...Object.keys(operatorMarks).map(name=>({id:`lifecycle:${name}`,name,pack:"lifecycle" as const})),
  ...Object.entries(manifest).flatMap(([pack,names])=>names.map(name=>({id:`${pack}:${name}`, name:name.replace(/-/g," "), pack:pack as IconPack}))),
  ...Object.keys(currencyMarks).map(name=>({id:`lifecycle:${name}`,name,pack:"lifecycle" as const})),
];
const available = new Set(iconCatalog.map(icon => icon.id));
const legacy: Record<string,string> = {cake:"tabler:cake",party:"tabler:confetti",flag:"tabler:flag",calendar:"tabler:calendar", "🌱":"tabler:seedling","🌿":"tabler:leaf","💼":"tabler:briefcase","🏠":"tabler:home","📚":"tabler:books","🎯":"tabler:target","🚀":"tabler:rocket","🎨":"tabler:palette","🏋️":"tabler:barbell","💻":"tabler:device-laptop","❤️":"tabler:heart"};
export function resolveIcon(value: string | null | undefined, fallback = "tabler:sparkles") { return value && available.has(value) ? value : value && Object.hasOwn(legacy,value) ? legacy[value] : fallback; }
export const iconData = (id: string) => data.get(id);
export const catalogVersion = () => version;
export const subscribeIcons = (listener: () => void) => { subscribers.add(listener); return () => { subscribers.delete(listener); }; };
const loading = new Map<string,Promise<void>>();
export function loadIconPack(pack: string): Promise<void> {
  if (!["circle-flags","simple-icons","twemoji"].includes(pack)) return Promise.resolve();
  const pending = loading.get(pack); if (pending) return pending;
  const request = (pack === "circle-flags" ? import("./flag-data.json") : pack==="twemoji"? import("./emoji-data.json") : import("./brand-data.json")).then(module => { register(pack as IconPack, module.default.icons, module.default.width, module.default.height); });
  loading.set(pack,request); request.catch(()=>loading.delete(pack)); return request;
}
