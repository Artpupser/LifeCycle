import {expect,type Locator} from "@playwright/test";
export function choiceRoot(control:Locator){return control.locator('xpath=ancestor-or-self::*[@data-choice-field][1]');}
export async function chooseChoice(control:Locator,selection:string|{label:string}){
 const root=choiceRoot(control);const value=typeof selection==="string"?selection:undefined;
 if(await root.getAttribute("role")==="radiogroup"){
  const option=value!==undefined?root.locator(`input[data-choice-option=${JSON.stringify(value)}]`):root.getByRole("radio",{name:(selection as {label:string}).label,exact:true});await option.click();return;
 }
 await control.click();const dialog=control.page().getByRole("dialog").last();
 const option=value!==undefined?dialog.locator(`button[data-choice-option=${JSON.stringify(value)}]`):dialog.getByRole("button",{name:(selection as {label:string}).label,exact:true});
 // Large catalogs page their results. Search by stable value when it is outside the initial page.
 if(!await option.count()&&value!==undefined)await dialog.getByRole("searchbox").fill(value);
 await option.click();
}
export async function expectChoiceValue(control:Locator,value:string){await expect(choiceRoot(control)).toHaveAttribute("data-choice-value",value);}
