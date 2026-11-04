import {createContext,useContext} from "react";
import type {Label} from "./types";
export const LabelCatalog=createContext<Label[]>([]);
export const useLabelCatalog=()=>useContext(LabelCatalog);

export type LabelSubject={kind:"notes"|"tasks"|"habits"|"workouts"|"exercises"|"contacts"|"countdowns"|"intimacy"|"boards";id:string};
export type LabelValue={label_id:string;subject_kind:LabelSubject["kind"];subject_id:string;revision:number;value:{amount:string;currency:string}};
export const FunctionalValues=createContext<LabelValue[]>([]);
