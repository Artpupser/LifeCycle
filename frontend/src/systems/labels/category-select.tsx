import {ChoiceField} from "@/components/ui/choice-picker";
import {useLabelCatalog} from "./context";

import {categoryName,eventCategories} from "./categories";
import {useLanguage} from "@/systems/i18n/locale";
import type {EventCategory} from "./types";
export function EventCategorySelect({id,value,change}:{id:string;value:EventCategory;change:(value:EventCategory)=>void}){useLanguage();const labels=useLabelCatalog();return <ChoiceField id={id} value={value} change={next=>change(next as EventCategory)}>{eventCategories.map(code=><option key={code} value={code}>{categoryName(code)}</option>)}{labels.filter(label=>label.kind==="category").map(label=><option key={label.id} value={`custom:${label.id}`}>{label.name}</option>)}</ChoiceField>;}
