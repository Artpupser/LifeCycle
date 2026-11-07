import {expect,test} from "@playwright/test";
import {chooseChoice} from "./choice-helpers";
test("shared fields preserve native validation, one form value, radio keys and numeric bounds",async({page})=>{
 const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));await page.clock.setFixedTime(new Date("2026-11-07T12:00:00Z"));await page.goto("/e2e/fixtures/controls.html");
 await page.getByRole("button",{name:"Сохранить пример",exact:true}).click();await expect(page.getByTestId("payload")).toHaveText("Не сохранено");
 const gender=page.getByRole("radiogroup",{name:"Пол",exact:true});await gender.getByRole("radio",{name:"Женский",exact:true}).check();await gender.getByRole("radio",{name:"Женский",exact:true}).press("ArrowRight");await expect(gender.getByRole("radio",{name:"Мужской",exact:true})).toBeChecked();
 await page.getByLabel("Человек",{exact:true}).click();const picker=page.getByRole("dialog");await expect(picker.getByRole("button",{name:"Человек 3",exact:true})).toBeDisabled();await picker.getByLabel("Поиск вариантов",{exact:true}).fill("Человек 12");await picker.getByLabel("Поиск вариантов",{exact:true}).press("ArrowDown");await page.keyboard.press("Enter");await expect(picker).toHaveCount(0);
 await page.getByLabel("Количество",{exact:true}).fill("0");await page.getByRole("button",{name:"Сохранить пример",exact:true}).click();await expect(page.getByTestId("payload")).toHaveText("Не сохранено");await page.getByLabel("Количество",{exact:true}).fill("5");
 await page.getByLabel("Быстрый выбор даты: fixture-date",{exact:true}).click();await page.getByRole("menuitem",{name:"Завтра",exact:true}).click();await expect(page.getByLabel("Дата",{exact:true})).toHaveValue("2026-11-08");await page.getByLabel("Дата",{exact:true}).fill("2026-11-07");
 await page.getByRole("button",{name:"Сохранить пример",exact:true}).click();await expect.poll(async()=>JSON.parse((await page.getByTestId("payload").textContent())!)).toEqual({gender:"male",recipient:"12",planned:"false",count:"5",note:"Черновик",date:"2026-11-07",allowed:"on"});expect(errors).toEqual([]);
});
test("ported choices lock with their fieldset while the dialog is open and keep mobile layout",async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto("/e2e/fixtures/controls.html");
 await page.getByLabel("Человек",{exact:true}).click();const picker=page.getByRole("dialog");await expect(picker).toBeVisible();
 await page.getByTestId("fields").evaluate((element:HTMLFieldSetElement)=>{element.disabled=true;});await expect(picker.getByRole("button",{name:"Человек 1",exact:true})).toBeDisabled();
 await picker.getByRole("button",{name:"Закрыть окно",exact:true}).click();await expect(page.getByRole("radio",{name:"Женский",exact:true})).toBeDisabled();await expect(page.getByLabel("Человек",{exact:true})).toBeDisabled();
 await page.getByTestId("fields").evaluate((element:HTMLFieldSetElement)=>{element.disabled=false;});await chooseChoice(page.getByLabel("Человек",{exact:true}),"1");await page.getByRole("radio",{name:"Женский",exact:true}).check();
 expect(await page.locator("html").evaluate(element=>element.scrollWidth)).toBeLessThanOrEqual(390);
 await page.screenshot({path:"/tmp/lifecycle-controls-mobile.png",fullPage:true});
});
