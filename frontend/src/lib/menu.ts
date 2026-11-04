import type {MouseEvent} from "react";
/** Close a filter/date disclosure after choosing an option. Entity actions use ObjectActions. */
export function closeActionMenu(event:MouseEvent<HTMLDetailsElement>){if(event.target instanceof Element&&event.target.closest("button,a"))event.currentTarget.open=false;}
