import { ErrorState, LoadingState } from "@/components/resource-state";
import { useResource } from "@/hooks/use-resource";
import { ConfigForm } from "./config-form";
import type { AiConfig } from "./types";

export function AiSettings() {
  const config = useResource<AiConfig>("/ai/settings");
  return <div className="mt-8">{config.resource.status === "loading" ? <LoadingState /> : config.resource.status === "error" ? <ErrorState message={config.resource.message} retry={config.retry} /> : <ConfigForm key={config.resource.data.revision} config={config.resource.data} onSaved={config.retry} onDirty={() => undefined} />}</div>;
}
