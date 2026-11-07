import {createContext} from "react";
export const FormFieldContext=createContext<{id:string;label:string;labelId:string;hintId?:string}|null>(null);
