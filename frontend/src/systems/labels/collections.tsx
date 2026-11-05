import {toggleKeys} from "@/systems/selection/state";
import {AppIcon} from "@/systems/icons/app-icon";
import {Link} from "react-router";
import {useLabelCatalog} from "./context";
import {t,useLanguage} from "@/systems/i18n/locale";
import {collectionLabel,collectionPresets,type CollectionKind} from "./collection-catalog";
export function CollectionPicker({kind,label,value,change,single=false}:{kind:CollectionKind;label:string;value:string[];change:(value:string[])=>void;single?:boolean}){
 useLanguage();const catalog=useLabelCatalog();const options=[...new Set([...collectionPresets[kind],...catalog.filter(item=>item.kind===kind).map(item=>item.name),...value])];
 return <fieldset className="space-y-3 rounded-xl border border-border bg-muted/20 p-4"><legend className="px-1 text-sm font-medium">{label}</legend><div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto">{options.map(item=><label key={item} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm ${value.includes(item)?'border-primary bg-primary/10 text-primary':'border-border bg-card'}`}><input type="checkbox" className="accent-primary" checked={value.includes(item)} disabled={!value.includes(item)&&!single&&value.length>=30} onChange={event=>change(single?(event.target.checked?[item]:[]):toggleKeys(value,item,event.target.checked))}/>{catalog.find(label=>label.kind===kind&&label.name===item)?.icon&&<AppIcon icon={catalog.find(label=>label.kind===kind&&label.name===item)?.icon} className="size-4"/>}{collectionLabel(item)}</label>)}</div><Link className="inline-block text-xs text-primary underline" to={`/labels?kind=${kind}`} target="_blank" rel="noopener noreferrer">{t("Настроить коллекцию")}</Link></fieldset>;
}
