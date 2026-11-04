export type Label={id:string;name:string;color:string;revision:number;is_system?:boolean;icon?:string|null;function_key?:"ai_access"|"cost"|null;kind?:"tag"|"category"|"toy"|"emotion"|"setting"|"functional"};
export type EventCategory="birthday"|"anniversary"|"holiday"|"personal"|"work"|"other"|`custom:${string}`;
