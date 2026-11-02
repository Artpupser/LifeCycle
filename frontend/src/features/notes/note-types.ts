import type {AiAccess} from "@/components/ai-visibility";
export type Folder={id:string;name:string;color:string};
export type NoteInput={title:string;content:string;tags:string[];color:string;folder_id:string|null};
export type Note=NoteInput&AiAccess&{id:string;updated_at:string};
export type NoteSelection=Record<string,{updated_at:string;ai_access_revision:number}>;
export const emptyNote=(folder:string):NoteInput=>({title:"",content:"",tags:[],color:"#2A9D8F",folder_id:folder||null});
