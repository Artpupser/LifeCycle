import {type ReactNode} from "react";
import {useResource} from "@/hooks/use-resource";
import type {Label} from "./types";
import {LabelCatalog} from "./context";
export function LabelProvider({children}:{children:ReactNode}) {const {resource}=useResource<Label[]>("/labels");return <LabelCatalog value={resource.status==="ready"?resource.data:[]}>{children}</LabelCatalog>;}
