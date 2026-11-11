import type {IconifyIcon} from "@iconify/react/offline";
import metadata from "../../../../shared/country-currencies.json" with {type:"json"};
const names={ru:new Intl.DisplayNames(["ru"],{type:"currency"}),en:new Intl.DisplayNames(["en"],{type:"currency"})};
export const currencyMarks:Record<string,IconifyIcon>=Object.fromEntries(Object.keys(metadata.currencies).map(code=>[`currency-${code.toLowerCase()}`,{width:24,height:24,body:`<rect x="1" y="4" width="22" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="12" y="15" text-anchor="middle" font-family="sans-serif" font-weight="600" font-size="8" fill="currentColor">${code}</text>`}]));
export function currencyIcon(code:string){const key=`currency-${code.toLowerCase()}`;return Object.hasOwn(currencyMarks,key)?`lifecycle:${key}`:"tabler:coin";}
export function currencyNames(code:string){return `${code} ${names.ru.of(code)??code} ${names.en.of(code)??code}`;}
