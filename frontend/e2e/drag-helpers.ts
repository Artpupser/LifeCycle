import {expect,type Locator,type Page} from "@playwright/test";
/** Pointer sensors initialize asynchronously; wait for activation and collision before releasing. */
export async function dragObject(page:Page,source:Locator,target:Locator){
 const handles=source.locator("[data-drag-handle]");const handle=await handles.count()?handles.first():source;
 await handle.hover();await page.mouse.down();await expect(source).toHaveAttribute("data-dragging","true");
 const bounds=(await target.boundingBox())!;
 await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2,{steps:12});
 await expect(target).toHaveAttribute("data-drop-target","true");await page.mouse.up();
}
