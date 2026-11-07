/// <reference types="vite/client" />
import {useState} from "react";
import {createRoot} from "react-dom/client";
import {BrowserRouter} from "react-router";
import {ActionMenuProvider} from "@/systems/actions/action-menu";
import {FormField} from "@/components/form-field";
import {ChoiceField} from "@/components/ui/choice-picker";
import {Input,Textarea} from "@/components/ui/input";
import {SaveButton,SaveForm} from "@/components/ui/save";
import {Button} from "@/components/ui/button";
import "@/index.css";
export function Controls(){
 const [gender,setGender]=useState("");const [recipient,setRecipient]=useState("");const [count,setCount]=useState("2");const [locked,setLocked]=useState(false);const [payload,setPayload]=useState<Record<string,FormDataEntryValue>|null>(null);
 return <main className="mx-auto max-w-2xl space-y-5 p-5"><Button onClick={()=>setLocked(value=>!value)}>{locked?"Разблокировать":"Заблокировать"}</Button><SaveForm onSubmit={event=>{event.preventDefault();setPayload(Object.fromEntries(new FormData(event.currentTarget)));}}><fieldset data-testid="fields" disabled={locked} className="space-y-5">
  <FormField id="fixture-gender" label="Пол"><ChoiceField id="fixture-gender" name="gender" required value={gender} change={setGender} options={[{value:"",label:"Не указано"},{value:"female",label:"Женский",icon:"tabler:gender-female"},{value:"male",label:"Мужской",icon:"tabler:gender-male"}]}/></FormField>
  <FormField id="fixture-recipient" label="Человек"><ChoiceField id="fixture-recipient" name="recipient" required value={recipient} change={setRecipient} options={Array.from({length:14},(_,index)=>({value:String(index),label:`Человек ${index}`,group:index<7?"Семья":"Другие",disabled:index===3}))}/></FormField>
  <FormField id="fixture-planned" label="Запланировано"><ChoiceField id="fixture-planned" name="planned" defaultValue="false"><option value="true">Да</option><option value="false">Нет</option></ChoiceField></FormField>
  <FormField id="fixture-count" label="Количество" hint="От 1 до 10"><Input id="fixture-count" name="count" type="number" min={1} max={10} required value={count} onChange={event=>setCount(event.target.value)}/></FormField>
  <FormField id="fixture-note" label="Заметка"><Textarea id="fixture-note" name="note" defaultValue="Черновик" required maxLength={40}/></FormField>
  <FormField id="fixture-date" label="Дата"><Input id="fixture-date" name="date" type="date" defaultValue="2026-11-07" required/></FormField>
  <label className="flex items-center gap-3"><Input name="allowed" type="checkbox" defaultChecked/>Разрешено</label>
  </fieldset><SaveButton type="submit">Сохранить пример</SaveButton></SaveForm><pre data-testid="payload" className="break-all whitespace-pre-wrap">{payload?JSON.stringify(payload):"Не сохранено"}</pre></main>;
}
createRoot(document.getElementById("root")!).render(<BrowserRouter><ActionMenuProvider><Controls/></ActionMenuProvider></BrowserRouter>);
