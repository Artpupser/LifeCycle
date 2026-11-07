import {Children,isValidElement,type ReactNode} from "react";
export type ChoiceOption={value:string;label:string;search?:string;icon?:string;suffix?:string;group?:string;disabled?:boolean;description?:string;content?:ReactNode};
function textOf(children:ReactNode):string{return Children.toArray(children).map(child=>typeof child==="string"||typeof child==="number"?String(child):isValidElement<{children?:ReactNode}>(child)?textOf(child.props.children):"").join("");}
/** Existing declarative option catalogs and explicit options share one normalized model. */
export function choiceOptions(children:ReactNode,group?:string,disabled=false):ChoiceOption[]{
 return Children.toArray(children).flatMap(child=>{
  if(!isValidElement<{children?:ReactNode;value?:string|number;label?:string;disabled?:boolean}>(child))return [];
  if(child.type==="option"){const label=child.props.label??textOf(child.props.children);return [{value:String(child.props.value??label),label,group,disabled:disabled||child.props.disabled}];}
  return choiceOptions(child.props.children,child.type==="optgroup"?child.props.label:group,disabled||Boolean(child.props.disabled));
 });
}
