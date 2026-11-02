import { useContext, useRef, useState, type ComponentProps } from "react";
import { CalendarDays, Clock3 } from "lucide-react";
import { PreferencesContext } from "@/features/settings/preferences-context";
import { dateTimePresets } from "@/lib/dates";
import { closeActionMenu } from "@/lib/menu";
import { cn } from "@/lib/utils";
export function DateTimeInput({ className, ref: forwarded, ...props }: ComponentProps<"input">) {
  const preferences = useContext(PreferencesContext);
  const zone = preferences?.settings.timezone ?? "UTC";
  const input = useRef<HTMLInputElement | null>(null);
  const [clock, setClock] = useState(Date.now);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const kind = props.type;
  function assign(element: HTMLInputElement | null) { input.current = element; if (typeof forwarded === "function") forwarded(element); else if (forwarded) forwarded.current = element; }
  function choose(value: string) {
    const element = input.current; if (!element) return;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.focus();
  }
  return <div className={cn("relative min-w-0", className?.includes("w-auto") ? "w-auto" : "w-full")}><input {...props} ref={assign} className={cn("h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3 pr-11 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60", className)} /><details data-menu onClick={closeActionMenu} className="absolute right-2 top-2" onToggle={(event) => { if (!event.currentTarget.open) return; setClock(Date.now()); const box = input.current?.getBoundingClientRect(); if (box) setPosition({ left: Math.max(8, Math.min(window.innerWidth - 248, box.left)), top: box.bottom + 8 > window.innerHeight - 200 ? Math.max(8, box.top - 200) : box.bottom + 8 }); }}><summary aria-label={`Быстрый выбор ${kind === "time" ? "времени" : "даты"}: ${props["aria-label"] ?? props.id ?? "поле"}`} className={`flex size-7 cursor-pointer list-none items-center justify-center rounded-md bg-background text-muted-foreground hover:bg-muted ${props.disabled ? "pointer-events-none opacity-40" : ""}`}>{kind === "time" ? <Clock3 className="size-4" /> : <CalendarDays className="size-4" />}</summary><div className="fixed z-[90] w-60 space-y-1 rounded-xl border border-border bg-card p-2 shadow-xl" style={position}>{dateTimePresets(kind, clock, zone, preferences?.settings.time_format ?? "24h", props.step === 1 || props.step === "1").map(([label, value]) => <button key={label} type="button" disabled={Boolean((props.min && value < String(props.min)) || (props.max && value > String(props.max)))} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-40" onClick={() => choose(value)}>{label}</button>)}<button type="button" className="block w-full rounded-lg border-t border-border px-3 py-2 text-left text-sm text-primary hover:bg-muted" onClick={() => { try { input.current?.showPicker(); } catch { input.current?.focus(); } }}>Выбрать {kind === "time" ? "время" : "дату"}…</button></div></details></div>;
}
