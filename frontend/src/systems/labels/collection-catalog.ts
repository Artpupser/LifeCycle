import definitions from "../../../../shared/collections.json";
import {t} from "@/systems/i18n/locale";
import type {Label} from "./types";
export type CollectionKind="toy"|"emotion"|"setting"|"position"|"porn_source"|"sex_type"|"lubricant"|"contraception";
export type CollectionDefinition={id:CollectionKind;name:string;expandable:boolean;sensitive:boolean;icon:string;entries:{value:string;name:string;description:string;icon:string}[]};
export const collectionCatalog=definitions as CollectionDefinition[];
export const collectionDefinition=(kind:CollectionKind)=>collectionCatalog.find(item=>item.id===kind)!;
export function isCollectionKind(kind:string|undefined):kind is CollectionKind{return collectionCatalog.some(item=>item.id===kind);}
export function collectionLabel(value:string,kind?:CollectionKind){const entry=collectionCatalog.filter(item=>!kind||item.id===kind).flatMap(item=>item.entries).find(entry=>entry.value.toLowerCase()===value.toLowerCase());return entry?t(entry.name):value;}
export type CollectionOption={value:string;name:string;description:string;image_id?:string|null;icon?:string|null;label?:Label;legacy?:boolean};
export function collectionOptions(kind:CollectionKind,labels:Label[],selected:string[]=[]):CollectionOption[]{
 const definition=collectionDefinition(kind);
 const saved:CollectionOption[]=labels.filter(label=>label.kind===kind&&(definition.expandable?(label.in_collection!==false||selected.includes(label.name)):definition.entries.some(entry=>entry.value===(label.value??label.name)||entry.name===label.name)||selected.includes(label.name))).map(label=>{const value=label.value??label.name;const fixed=definition.entries.find(entry=>entry.value===value||entry.name===label.name);return {value:fixed?(selected.includes(fixed.name)&&!selected.includes(fixed.value)?fixed.name:fixed.value):label.name,name:fixed?t(fixed.name):label.name,description:fixed?t(fixed.description):label.description??"",image_id:label.image_id,icon:fixed?.icon??label.icon??definition.icon,legacy:!definition.expandable&&!fixed,label};});
 return [...saved,...selected.filter(value=>!saved.some(item=>item.value===value)).map(value=>({value,name:value,description:"",legacy:true}))];
}

export const visibleCollectionCatalog=(hidden:readonly string[])=>collectionCatalog.filter(item=>!hidden.includes(item.id));
