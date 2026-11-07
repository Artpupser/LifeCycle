import {useLanguage} from "@/systems/i18n/locale";
import {AppIcon} from "./app-icon";
import {genderIcon,genderName,type Gender} from "./gender";
export function GenderBadge({gender}:{gender:Gender|undefined}){
 useLanguage();return !gender||gender==="unspecified"?null:<AppIcon icon={genderIcon(gender)} aria-label={genderName(gender)} className="size-4 text-muted-foreground"/>;
}
