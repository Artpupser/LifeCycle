import {zodiacCode} from "@/lib/dates";
import {t,useLanguage} from "@/systems/i18n/locale";
import {AppIcon} from "./app-icon";
import {zodiacNames} from "./zodiac";
export function ZodiacBadge({birthDate}:{birthDate:string|null|undefined}){useLanguage();const code=zodiacCode(birthDate);return code?<span className="inline-flex items-center gap-2 rounded-lg bg-muted px-2 py-1 text-sm" aria-label={t("Знак зодиака")}><AppIcon icon={`tabler:zodiac-${code}`}/>{t(zodiacNames[code])}</span>:null;}
