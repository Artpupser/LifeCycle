import { expect, type Page, type APIRequestContext } from "@playwright/test";

export async function login(page: Page, request: APIRequestContext) {
  const email = `core-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
  const mailpit = process.env.MAILPIT_URL ?? "http://localhost:8025";
  await page.goto("/login");
  await page.getByLabel("Электронная почта", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Получить код", exact: true }).click();
  let code = "";
  await expect.poll(async () => {
    const inbox = await (await request.get(`${mailpit}/api/v1/messages`)).json() as { messages: { ID: string; To: { Address: string }[] }[] };
    const message = inbox.messages.find((item) => item.To.some((recipient) => recipient.Address === email));
    if (!message) return false;
    const detail = await (await request.get(`${mailpit}/api/v1/message/${message.ID}`)).json() as { Text: string };
    code = detail.Text.match(/\b\d{6}\b/)?.[0] ?? "";
    return code.length === 6;
  }, { timeout: 20_000 }).toBe(true);
  await page.getByLabel("Код подтверждения").fill(code);
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(page.getByRole("button", { name: "Выйти", exact: true })).toBeVisible();
}

export async function confirmUi(page:Page,trigger:()=>Promise<unknown>,approve=true){
  await trigger();const dialog=page.getByRole("alertdialog");await expect(dialog).toBeVisible();
  if(approve)await dialog.getByRole("button").last().click();else await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
}
export async function quickNote(page:Page,title:string){await page.getByRole("button",{name:"Новая заметка",exact:true}).click();await page.getByLabel("Название новой заметки",{exact:true}).fill(title);await page.getByLabel("Название новой заметки",{exact:true}).press("Enter");await expect(page.getByRole("button",{name:title,exact:true})).toBeVisible();}
export async function noteProperties(page:Page,title:string){await page.getByRole("button",{name:title,exact:true}).click();await page.getByRole("tab",{name:"Характеристики",exact:true}).click();}

/** Choose an entity action through the shared popup (also supports an already open menu). */
export async function chooseAction(page:Page,name:string,scope:import('@playwright/test').Locator|Page=page){
 const popup=page.getByRole('menu',{name:'Действия',exact:true});
 if(await popup.count()){const item=popup.getByRole('menuitem',{name,exact:true});if(await item.count()){await item.click();return;}await page.keyboard.press('Escape');}
 let activeScope=scope;
 await expect.poll(async()=>{activeScope=scope===page&&await page.getByRole('dialog').count()?page.getByRole('dialog').last():scope;return activeScope.locator('button[data-context-ignore]').count();}).toBeGreaterThan(0);
 const triggers=activeScope.locator('button[data-context-ignore]');await expect(triggers.first()).toBeVisible();
 for(let index=0;index<await triggers.count();index++){await triggers.nth(index).click();await expect(popup).toBeVisible();const item=popup.getByRole('menuitem',{name,exact:true});if(await item.count()){await item.click();return;}await page.keyboard.press('Escape');}
 throw new Error(`Entity action not found: ${name}`);
}

/** Select or create exact tag names through the shared registry picker. */
export async function selectTags(page:Page,label:string,names:string[]){
 const input=page.getByLabel(label,{exact:true});
 for(const name of names){await input.fill(name);await input.press("Enter");await expect(page.getByRole("checkbox",{name,exact:true})).toBeChecked();await expect(input).toHaveValue("");}
}
