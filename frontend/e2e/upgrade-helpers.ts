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
 async function pickNested(){
  const item=popup.getByRole('menuitem',{name,exact:true});if(await item.count()){await item.click();return true;}
  for(const branch of [/^Множественный выбор/,/^Действия с выбранными заметками/]){const child=popup.getByRole('menuitem',{name:branch});if(await child.count()){await child.click();const target=popup.getByRole('menuitem',{name,exact:true});if(await target.count()){await target.click();return true;}}}
  return false;
 }
 let activeScope=scope;
 await expect.poll(async()=>{activeScope=scope===page&&await page.getByRole('dialog').count()?page.getByRole('dialog').last():scope;return activeScope.locator('button[data-context-ignore]').count();}).toBeGreaterThan(0);
 const triggers=activeScope.locator('button[data-context-ignore]');await expect(triggers.first()).toBeVisible();
 for(let index=0;index<await triggers.count();index++){await triggers.nth(index).click();await expect(popup).toBeVisible();if(await pickNested())return;await page.keyboard.press('Escape');}
 throw new Error(`Entity action not found: ${name}`);
}

/** Select or create exact tag names through the shared registry picker. */
export async function selectTags(page:Page,label:string,names:string[]){
 const input=page.getByLabel(label,{exact:true});
 for(const name of names){await input.fill(name);await input.press("Enter");await expect(page.getByRole("checkbox",{name,exact:true})).toBeChecked();await expect(input).toHaveValue("");}
}

/** Personal collections intentionally start empty; create options through their shared editor. */
export async function addCollectionItem(page:Page,collection:string,name:string){
 const group=page.getByRole("group",{name:collection,exact:true});
 await group.getByRole("button",{name:"Добавить в коллекцию",exact:true}).click();
 const editor=page.getByRole("dialog",{name:"Новый элемент коллекции",exact:true});
 await editor.getByLabel("Название",{exact:true}).fill(name);
 await editor.getByRole("button",{name:"Сохранить",exact:true}).click();
 await expect(editor).toHaveCount(0);
 await expect(group.getByRole("checkbox",{name,exact:true})).toBeChecked();
}

/** Assign the same functional label through its shared adapter in every subject view. */
export async function shareAiLabel(page:Page,title:string){
 const editor=page.getByRole("region",{name:"Редактор заметки",exact:true});
 if(await editor.count())await editor.getByRole("button",{name:"Метки",exact:true}).click();
 else {
  const subject=page.locator("article").filter({has:page.getByRole("heading",{name:title,exact:true}).or(page.getByRole("button",{name:title,exact:true}))});
  await chooseAction(page,"Метки",subject);
 }
 const dialog=page.getByRole("dialog",{name:"Метки",exact:true});
 await dialog.getByRole("button",{name:"Добавить метку AI Доступ",exact:true}).click();
 await expect(dialog.getByRole("button",{name:"Снять метку",exact:true})).toBeVisible();
 await dialog.getByRole("button",{name:"Закрыть окно",exact:true}).click();
}
