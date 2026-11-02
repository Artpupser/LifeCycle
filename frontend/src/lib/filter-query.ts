export type FilterSpec={key:string;label:string;aliases?:string[];example:string;values?:string[];type?:"date"};
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
    if(!spec){result.errors.push(`Неизвестный фильтр «${key}». Откройте подсказку рядом с поиском.`);continue;}
    if(!raw||raw.startsWith('"')&&!raw.endsWith('"')){result.errors.push(`Укажите значение фильтра «${spec.label}».`);continue;}
    const value=decode(raw);if((spec.type==="date"||spec.key==="from"||spec.key==="to")&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(`${value}T00:00:00Z`))||new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)!==value)){result.errors.push("Дата фильтра: ГГГГ-ММ-ДД.");continue;}if(!value.trim()){result.errors.push(`Пустое значение фильтра «${spec.label}».`);continue;}
    if(spec.values&&!spec.values.some(item=>normalize(item)===normalize(value))){result.errors.push(`${spec.label}: ${spec.values.join(", ")}.`);continue;}
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
export const tagFilter:FilterSpec={key:"tag",aliases:["тег"],label:"Тег",example:'тег:"работа"'};
export const aiFilter:FilterSpec={key:"ai",aliases:["доступ"],label:"AI доступ",example:"ai:да",values:["да","нет","yes","no","true","false","private","ai_shared"]};
