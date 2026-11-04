import {useLabelCatalog} from "./context";
import {categoryName} from "./categories";
import {TagChip} from "./inputs";
export function CategoryChip({value}:{value:string}){const catalog=useLabelCatalog();const label=catalog.find(label=>label.kind==="category"&&`custom:${label.id}`===value);return <TagChip name={categoryName(value,catalog)} kind="category" color={label?.color} icon={label?.icon}/>;}
