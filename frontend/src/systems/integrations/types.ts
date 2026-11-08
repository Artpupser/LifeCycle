import registry from "../../../../shared/integrations.json";
export const integrationProviders=registry;
export type Integration={instance_id:string|null;id:string;name:string;icon:string;kind:string;capabilities:string[];settings_path:string;display_name?:string|null;syncing?:boolean;retry_at?:string|null;client_id?:string|null;connected:boolean;configured:boolean;account_id:string|null;revision:number;last_synced_at:string|null;last_error:string|null};

export type CodeLogin={url:string;state:string};
export type SyncResult={pending:boolean};
