import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoadingState() {
  return <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-muted-foreground" role="status"><LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> Загружаем данные…</div>;
}

export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div className="rounded-2xl border border-border bg-card p-8"><p className="mb-5 text-sm leading-6" role="alert">{message}</p><Button variant="outline" onClick={retry}>Попробовать снова</Button></div>;
}
