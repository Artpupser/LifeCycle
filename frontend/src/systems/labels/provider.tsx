import {FunctionalValues,type LabelValue} from "./context";
import {type ReactNode} from "react";
import {useResource} from "@/hooks/use-resource";
import type {Label} from "./types";
import {LabelCatalog} from "./context";
export function LabelProvider({children}:{children:ReactNode}) {const {resource}=useResource<Label[]>("/labels");const values=useResource<LabelValue[]>("/labels/values");return <LabelCatalog value={resource.status==="ready"?resource.data:[]}><FunctionalValues value={values.resource.status==="ready"?values.resource.data:[]}>{children}</FunctionalValues></LabelCatalog>;}
