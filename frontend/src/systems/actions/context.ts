import {createContext,useContext} from "react";
export type ContextAction={id:string;label:string;icon?:string;disabled?:boolean;danger?:boolean;children?:ContextAction[];numberInput?:{label:string;initial?:number;step?:number;min:number;max?:number;submit:(value:number)=>void};run:()=>void};
export const ActionsContext=createContext<(actions:ContextAction[],x:number,y:number,returnTo?:HTMLElement|SVGElement|null)=>void>(()=>{});
export const useActionMenu=()=>useContext(ActionsContext);
