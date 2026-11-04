import {createContext,useContext} from "react";
export type ContextAction={id:string;label:string;icon?:string;disabled?:boolean;danger?:boolean;run:()=>void};
export type Menu={actions:ContextAction[];x:number;y:number;returnTo:HTMLElement|SVGElement|null};
export const ActionsContext=createContext<(actions:ContextAction[],x:number,y:number,returnTo?:HTMLElement|SVGElement|null)=>void>(()=>{});
export const useActionMenu=()=>useContext(ActionsContext);
