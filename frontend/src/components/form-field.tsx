import type { ReactNode } from "react";

export function FormField({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return <div className="space-y-2"><label htmlFor={id} className="block text-sm font-medium">{label}</label>{children}{hint && <p id={`${id}-hint`} className="text-xs leading-5 text-muted-foreground">{hint}</p>}</div>;
}
