import { t, useLanguage } from "@/systems/i18n/locale";
import { LoaderCircle } from "@/components/icons";
import { Button } from "@/components/ui/button";

export function LoadingState() {
  useLanguage();
  return <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-muted-foreground" role="status"><LoaderCircle className="size-5" aria-hidden="true" /> {t(" Загружаем данные…")}</div>;
}

export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  useLanguage();
  return <div className="rounded-2xl border border-border bg-card p-8"><p className="mb-5 text-sm leading-6" role="alert">{message}</p><Button variant="outline" onClick={retry}>{t("Попробовать снова")}</Button></div>;
}
