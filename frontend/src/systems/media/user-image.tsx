import { useState, type ComponentProps } from "react";
import { mediaUrl } from "./media";
import {AppIcon} from "@/systems/icons/app-icon";
import {cn} from "@/lib/utils";
import { t, useLanguage } from "@/systems/i18n/locale";
/** Every user image uses authenticated, owned media URLs and a consistent failure state. */
export function UserImage({src,alt="",className,...props}: Omit<ComponentProps<"img">,"src"> & {src:string}) {
  useLanguage();
  const [failed,setFailed]=useState<string|null>(null);
  const url=mediaUrl(src);
  return url && failed!==url ? <img {...props} className={className} src={url} alt={alt} loading={props.loading??"lazy"} decoding="async" onError={()=>setFailed(url)}/> : <span className={cn("inline-flex items-center justify-center gap-2 overflow-hidden bg-surface-2 p-4 text-center text-caption text-fg-muted",className)} role="img" aria-label={alt?t("Нет предпросмотра: {title}",{title:alt}):t("Изображение недоступно")}><AppIcon icon="tabler:photo-off" aria-hidden="true"/><span>{t("Изображение недоступно")}</span></span>;
}
