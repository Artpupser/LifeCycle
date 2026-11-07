import {revalidateActiveResources} from "@/systems/loading/cache";
export function refreshCollectionResources(){revalidateActiveResources(["/labels","/sex","/analytics","/ai"]);}
