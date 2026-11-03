import {createContext,useContext} from "react";
import type {Label} from "./types";
export const LabelCatalog=createContext<Label[]>([]);
export const useLabelCatalog=()=>useContext(LabelCatalog);
