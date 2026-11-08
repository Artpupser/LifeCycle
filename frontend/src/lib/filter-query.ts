import { t } from "@/systems/i18n/locale";
import { dayDifference, isCalendarDate } from "./dates";
export type FilterSpec={key:string;label:string;aliases?:string[];example:string;values?:string[];type?:"date";control?:boolean;choices?:{value:string;label:string;icon?:string}[]};
export type FilterTerm={key:string;value:string;negative:boolean};
export type FilterQuery={text:string;terms:FilterTerm[];errors:string[]};
const normalize=(value:string)=>value.toLocaleLowerCase("ru-RU");
export function parseFilterQuery(source:string,specs:FilterSpec[]):FilterQuery {
  const result:FilterQuery={text:"",terms:[],errors:[]};const words:string[]=[];
  const tokens=source.match(/(?:[^\s"\\]|\\.|"(?:\\.|[^"\\])*")+|"[^"]*$/gu)??[];
  const decode=(value:string)=>value.replace(/^"|"$/g,"").replace(/\\(.)/g,"$1");
  for(const token of tokens){
    const match=token.match(/^(-?)([\p{L}_]+):(.*)$/u);
    if(!match||/^(https?|mailto):/i.test(token)){words.push(decode(token));continue;}
    const [,negative,key,raw]=match;const spec=specs.find(item=>[item.key,...item.aliases??[]].some(alias=>normalize(alias)===normalize(key)));
    if(!spec){result.errors.push(t("Неизвестный фильтр «{v0}». Откройте подсказку рядом с поиском.", {v0: key}));continue;}
    if(!raw||raw.startsWith('"')&&!raw.endsWith('"')){result.errors.push(t("Укажите значение фильтра «{v0}».", {v0: spec.label}));continue;}
    const value=decode(raw);if((spec.type==="date"||spec.key==="from"||spec.key==="to")&&!isCalendarDate(value)){result.errors.push(t("Дата фильтра: ГГГГ-ММ-ДД."));continue;}if(!value.trim()){result.errors.push(t("Пустое значение фильтра «{v0}».", {v0: spec.label}));continue;}
    if(spec.values&&!spec.values.some(item=>normalize(item)===normalize(value))){result.errors.push(`${spec.label}: ${spec.values.join(", ")}.`);continue;}
    if(spec.control && (negative || result.terms.some(term=>term.key===spec.key))){result.errors.push(t("Фильтр «{v0}» задаётся один раз, без исключения.", {v0: spec.label}));continue;}
    result.terms.push({key:spec.key,value,negative:negative==="-"});
  }
  result.text=words.join(" ");return result;
}
export function filterValue(query:FilterQuery,key:string){return query.terms.find(term=>term.key===key&&!term.negative)?.value??"";}
type Field=string|string[]|number|boolean|null|undefined;
function matchValue(actual:Field,expected:string):boolean {
  if(Array.isArray(actual))return actual.some(value=>matchValue(value,expected));
  if(actual===null||actual===undefined)return false;
  if(typeof actual==="boolean"){const positive=["true","yes","да","1","shared","ai_shared","доступен","выполнено"];const negative=["false","no","нет","0","private","закрыт"];const value=normalize(expected);return positive.includes(value)?actual:negative.includes(value)?!actual:false;}
  const value=normalize(String(actual??""));const wanted=normalize(expected);const comparison=wanted.match(/^(>=|<=|>|<|=)(.+)$/);
  if(comparison){const [,operator,right]=comparison;const left=typeof actual==="number"?actual:value;const other=typeof actual==="number"?Number(right):right;return operator===">="?left>=other:operator==="<="?left<=other:operator===">"?left>other:operator==="<"?left<other:left===other;}
  return value===wanted;
}
export function matchesFilter(query:FilterQuery,text:string,fields:Record<string,Field>):boolean {
  if(query.errors.length)return false;
  if(!normalize(text).includes(normalize(query.text)))return false;
  return query.terms.every(term=>term.negative?!matchValue(fields[term.key],term.key==="from"?`>=${term.value}`:term.key==="to"?`<=${term.value}`:term.value):matchValue(fields[term.key],term.key==="from"?`>=${term.value}`:term.key==="to"?`<=${term.value}`:term.value));
}
export const tagFilter:FilterSpec={key:"tag",aliases:["тег"],get label() { return t("Тег"); },example:'тег:"работа"'};
export const aiFilter:FilterSpec={key:"ai",aliases:["доступ"],get label() { return t("AI доступ"); },example:"ai:да",values:["да","нет","yes","no","true","false","private","ai_shared"]};

export const rangeFilters: FilterSpec[] = [
  { key: "from", aliases: ["с"], get label() { return t("Период с"); }, example: "с:2026-11-01", type: "date", control: true },
  { key: "to", aliases: ["по"], get label() { return t("Период по"); }, example: "по:2026-11-30", type: "date", control: true },
];
/** Validate server-backed ranges before loading either rows or their statistics. */
export function filterRange(query: FilterQuery, defaults: { from: string; to: string }) {
  const from = filterValue(query, "from") || defaults.from;
  const to = filterValue(query, "to") || defaults.to;
  const days = dayDifference(from, to);
  const error = query.errors[0] ?? (query.text ? t("Используйте фильтры из подсказки рядом с поиском.") : days < 0 || days > 365 ? "Период: от 1 до 366 дат включительно." : null);
  return { from, to, error };
}
export const categoryFilter: FilterSpec = { key: "category", aliases: ["категория"], get label() { return t("Категория"); }, example: 'категория:"Личное"' };
export function filterLiteral(value: string) { return JSON.stringify(value); }

/** Replace one positive filter, preserving free text, exclusions and unrelated tokens. */
export function setFilterValue(source:string,specs:FilterSpec[],key:string,value:string|null){
 const spec=specs.find(item=>item.key===key);if(!spec)return source;
 const aliases=[spec.key,...spec.aliases??[]].map(normalize);
 const tokens=source.match(/(?:[^\s"\\]|\\.|"(?:\\.|[^"\\])*")+|"[^"]*$/gu)??[];
 const kept=tokens.filter(token=>{const match=token.match(/^([\p{L}_]+):/u);return !match||!aliases.includes(normalize(match[1]));});
 if(value!==null)kept.push(`${spec.key}:${/^[^\s"\\]+$/u.test(value)?value:filterLiteral(value)}`);
 const next=kept.join(" ");return next.length<=1000?next:source;
}
