import brandColors from "./brand-colors.json";
import { Icon, type IconProps } from "@iconify/react/offline";
import { useEffect, useSyncExternalStore } from "react";
import { catalogVersion, iconData, loadIconPack, resolveIcon, subscribeIcons } from "./catalog";
import { cn } from "@/lib/utils";
export type AppIconProps = Omit<IconProps, "icon"> & {icon: string | null | undefined; strokeWidth?: number};
/** Only bundled SVG data is rendered; names never cause third-party requests. */
export function AppIcon({icon, className, strokeWidth, ...props}: AppIconProps) {
  const id = resolveIcon(icon);
  useSyncExternalStore(subscribeIcons, catalogVersion, catalogVersion);
  const data = iconData(id);
  useEffect(()=>{if(!data) void loadIconPack(id.split(":")[0]).catch(()=>{});},[id,data]);
  return <Icon {...props} data-icon={id} icon={data ?? iconData("tabler:sparkles")!} className={cn("inline-block size-5 shrink-0",className)} style={{...props.style,...(id.startsWith("simple-icons:")?{color:["#000000","#181717"].includes((brandColors as Record<string,string>)[id])?`light-dark(${(brandColors as Record<string,string>)[id]}, #ffffff)`:(brandColors as Record<string,string>)[id]}:{}),...(strokeWidth ? {strokeWidth} : {})}} aria-hidden={props["aria-label"] ? undefined : true} role={props["aria-label"] ? "img" : undefined}/>;
}
