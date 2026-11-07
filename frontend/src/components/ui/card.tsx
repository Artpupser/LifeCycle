import {t} from "@/systems/i18n/locale";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-border bg-card text-card-foreground", className)} {...props} />;
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-2 p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("font-semibold tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-sm leading-6 text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-6 pb-6", className)} {...props} />;
}

/** Compact metric presentation shared by analytics, habits and journal summaries. */
export function MetricList({values,tiles=false}:{values:readonly (readonly [string,ReactNode])[];tiles?:boolean}) {
  return <dl className={tiles?"grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3":"divide-y divide-border/60"}>{values.map(([label,value])=><div key={label} className={tiles?"min-w-0":"flex min-w-0 items-baseline justify-between gap-4 py-1.5 text-sm"}><dt className="min-w-0 text-xs text-muted-foreground">{label}</dt><dd className={cn("break-words font-semibold tabular-nums",tiles?"mt-0.5 text-xl tracking-tight":"min-w-0 max-w-[60%] text-right")}>{value}</dd></div>)}</dl>;
}
export function MetricDetails({children}:{children:ReactNode}) {
 return <details className="text-xs text-muted-foreground"><summary className="min-h-8 cursor-pointer py-1.5 text-primary">{t("О расчёте")}</summary><div className="space-y-2 pb-2 leading-5">{children}</div></details>;
}
export function Metrics({title,values,children}:{title:string;values:readonly (readonly [string,ReactNode])[];children?:ReactNode}) {
 return <section aria-label={title} className="min-w-0 space-y-2 rounded-xl border border-border bg-card p-4"><h2 className="text-base font-semibold">{title}</h2><MetricList values={values}/>{children&&<MetricDetails>{children}</MetricDetails>}</section>;
}
