import {chooseAction} from "./upgrade-helpers";
import {expect,test} from "@playwright/test";
import {login,confirmUi,quickNote} from "./upgrade-helpers";

test.use({viewport:{width:390,height:844}});
test.afterEach(async({page},info)=>{if(info.status==='passed')expect(await page.locator('html').evaluate(node=>node.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);});

test('right-click actions work for notes and keyboard escape restores focus',async({page,request})=>{
 await login(page,request);await page.goto('/notes');await quickNote(page,'Контекстная заметка');
 const card=page.locator('article').filter({has:page.getByRole('button',{name:'Контекстная заметка',exact:true})});
 await card.click({button:'right'});const menu=page.getByRole('menu',{name:'Действия',exact:true});await expect(menu.getByRole('menuitem',{name:'Редактировать',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(menu).toHaveCount(0);
 await card.getByRole('button',{name:'Контекстная заметка',exact:true}).focus();await page.keyboard.press('Shift+F10');await expect(menu).toBeVisible();await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');
 await card.click({button:'right'});await menu.getByRole('menuitem',{name:'Редактировать',exact:true}).click();await expect(page.getByLabel('Название заметки',{exact:true})).toHaveValue('Контекстная заметка');
});

test('task context dates persist and outside-period Gantt rows disappear',async({page,request})=>{
 await login(page,request);const headers={Origin:new URL(page.url()).origin};const task=(await (await page.request.post('/api/tasks',{headers,data:{title:'Быстрая дата'}})).json());
 await page.goto('/tasks');const card=page.locator('article').filter({has:page.getByRole('button',{name:'Быстрая дата',exact:true})});await card.click({button:'right'});await page.getByRole('menuitem',{name:'Завтра',exact:true}).click();
 await expect.poll(async()=>{const data=await (await page.request.get(`/api/tasks/${task.id}`)).json();return data.schedule?.start_date;}).toBe(new Date(Date.now()+86400000).toISOString().slice(0,10));
 await page.reload();await expect(card).toContainText('Завтра');
 const board=await (await page.request.post('/api/boards',{headers,data:{name:'Шкала'}})).json();await page.request.put(`/api/boards/${board.board.id}/items/${task.id}`,{headers,data:{revision:board.board.revision,column_id:board.columns[0].id}});
 await page.goto(`/tasks?board=${board.board.id}`);await page.getByRole('button',{name:'Gantt',exact:true}).click();await page.getByLabel('Начало шкалы доски',{exact:true}).fill('2030-01-01');await expect(page.getByRole('button',{name:'Редактировать Быстрая дата',exact:true})).toHaveCount(0);
});

test('journal uses collections, one-entry statistics and a shared context menu',async({page,request},info)=>{
 await login(page,request);await page.goto('/sex');await page.getByRole('button',{name:'Новое событие',exact:true}).click();
 await expect(page.getByLabel('При повторе часа (DST)',{exact:true})).toHaveCount(0);await expect(page.getByLabel('Количество эякуляций',{exact:true})).toHaveCount(0);
 for(const name of ['Вибратор','Спокойствие','Дома'])await page.getByRole('checkbox',{name,exact:true}).check();
 await page.getByRole('button',{name:'Сохранить событие',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);const card=page.getByRole('region',{name:'События журнала',exact:true}).locator('article');await expect(card).toContainText('Вибратор');await page.reload();await expect(card).toContainText('Спокойствие');
 await card.click({button:'right'});await expect(page.getByRole('menuitem',{name:'Редактировать',exact:true})).toBeVisible();await page.keyboard.press('Escape');await page.screenshot({path:info.outputPath('journal-collections.png'),fullPage:true});
});

test('untimed countdowns have civil units and no running clock',async({page,request})=>{
 await login(page,request);await page.goto('/countdowns');await page.getByRole('button',{name:'Новое событие',exact:true}).click();await page.getByLabel('Название события',{exact:true}).fill('Поездка');await page.getByLabel('Дата события',{exact:true}).fill('2027-01-01');await page.getByLabel('Единица отсчёта',{exact:true}).selectOption('weeks');await page.getByRole('button',{name:'Сохранить событие',exact:true}).click();
 const card=page.locator('article');await expect(card).toContainText('нед.');await expect(card.locator('.font-mono')).toHaveCount(0);await page.reload();await expect(card).toContainText('нед.');
});

test('global history includes real changes and removal keeps the original record',async({page,request})=>{
 await login(page,request);await page.goto('/notes');await quickNote(page,'Сохранённая запись');await page.goto('/history');await expect(page.getByRole('heading',{name:'История действий',exact:true})).toBeVisible();
 const first=page.locator('article').first();await expect(first).toContainText('Заметки');await confirmUi(page,()=>chooseAction(page,'Убрать из истории',first));await page.goto('/notes');await expect(page.getByRole('button',{name:'Сохранённая запись',exact:true})).toBeVisible();
});

test('Ollama settings load local models and render escaped newlines as paragraphs',async({page,request})=>{
 await login(page,request);await page.goto('/ai');await page.getByRole('button',{name:'Настройки AI',exact:true}).click();await page.getByLabel('Провайдер AI',{exact:true}).selectOption('ollama');await page.getByLabel('Адрес Ollama',{exact:true}).fill('http://ollama:11434');await page.getByLabel('Модель Ollama',{exact:true}).fill('qa-model:latest');await page.getByLabel('Разрешить отправку сообщений в Ollama',{exact:true}).check();await page.getByRole('button',{name:'Сохранить настройки AI',exact:true}).click();
 await page.getByRole('button',{name:'Загрузить локальные модели',exact:true}).click();await expect(page.locator('#ai-models option[value="qa-model:latest"]')).toHaveCount(1);
 await page.getByRole('button',{name:'Закрыть настройки AI',exact:true}).click();await page.getByLabel('Ваше сообщение',{exact:true}).fill('Проверка переноса');await page.getByRole('button',{name:'Отправить',exact:true}).click();
 const answer=page.getByRole('article',{name:'Сообщение и ответ AI',exact:true});await expect(answer.locator('.markdown p')).toHaveCount(2,{timeout:15000});await expect(answer).toContainText('QA answer');await expect(answer).not.toContainText('QA answer\\n');
});
