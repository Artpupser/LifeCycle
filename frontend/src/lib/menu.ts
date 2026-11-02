import type { MouseEvent } from "react";
export function closeActionMenu(event: MouseEvent<HTMLDetailsElement>) {
  if (event.target instanceof Element && event.target.closest("button, a")) event.currentTarget.open = false;
}
