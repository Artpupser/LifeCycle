import { useState, type ComponentProps } from "react";
import { mediaUrl } from "./media";
import { t, useLanguage } from "@/systems/i18n/locale";
/** Every user image uses authenticated, owned media URLs and a consistent failure state. */
export function UserImage({src,alt="",...props}: Omit<ComponentProps<"img">,"src"> & {src:string}) {
  useLanguage();
  const [failed,setFailed]=useState<string|null>(null);
  const url=mediaUrl(src);
  return url && failed!==url ? <img {...props} src={url} alt={alt} loading={props.loading??"lazy"} decoding="async" onError={()=>setFailed(url)}/> : <span className="text-sm text-muted-foreground" role="status">{alt || t("Изображение недоступно")}</span>;
}
