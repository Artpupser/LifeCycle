import type {ComponentProps} from "react";
import {AppIcon} from "@/systems/icons/app-icon";
import {linkIcon,safeExternalUrl,type LinkService} from "./links";
export function ExternalLink({href="",service,children,className,...props}:ComponentProps<"a">&{service?:LinkService}){const safe=safeExternalUrl(href);if(!safe)return <span className={className}>{children}</span>;const web=/^https?:/i.test(safe);return <a {...props} href={safe} className={className} target={web?"_blank":undefined} rel={web?"noopener noreferrer":undefined}><AppIcon icon={linkIcon(safe,service)} className="mr-1 inline-block size-3.5 align-text-bottom"/>{children}</a>;}
