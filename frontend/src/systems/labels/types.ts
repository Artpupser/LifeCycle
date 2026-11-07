import type {CollectionKind} from "./collection-catalog";
export type Label={value?:string|null;in_collection?:boolean;id:string;name:string;color:string;revision:number;is_system?:boolean;repeatable?:boolean;icon?:string|null;function_key?:"ai_access"|"cost"|null;kind?:"tag"|"category"|"functional"|CollectionKind;description?:string;image_id?:string|null};
export type EventCategory="birthday"|"anniversary"|"holiday"|"personal"|"work"|"other"|`custom:${string}`;
