// @vitest-environment jsdom
import {it,expect,vi} from "vitest";
import {render,screen,waitFor,within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {useState} from "react";
import {Dialog} from "@/components/dialog";
import {PreferencesContext} from "@/features/settings/preferences-context";
import type {Settings} from "@/features/settings/types";
import {mockSettings} from "@/testing/handlers";
import {Input} from "./input";

it("preserves native validation and fieldset disabling while replacing the browser calendar",async()=>{
 const submitted=vi.fn();function Editor(){const [value,setValue]=useState("2026-11-11"),[disabled,setDisabled]=useState(true);return <form onSubmit={event=>{event.preventDefault();submitted();}}><fieldset disabled={disabled}><Input type="date" aria-label="Date" required min="2026-11-01" max="2026-11-30" value={value} onChange={event=>setValue(event.target.value)}/></fieldset><button type="button" onClick={()=>setDisabled(false)}>Unlock</button><button type="submit">Submit</button></form>;}
 render(<Editor/>);const user=userEvent.setup();const picker=screen.getByRole("button",{name:"Выбрать дату… Date"});
 expect(picker).toBeDisabled();await user.click(screen.getByText("Unlock"));await waitFor(()=>expect(picker).toBeEnabled());
 const field=screen.getByRole("textbox",{name:"Date"});expect(field).toHaveAttribute("type","text");
 await user.clear(field);await user.type(field,"2026-12-01");expect(field).toBeInvalid();await user.click(screen.getByText("Submit"));expect(submitted).not.toHaveBeenCalled();
 await user.clear(field);await user.type(field,"2026-11-11");await user.click(picker);
 const dialog=screen.getByRole("dialog");await user.click(within(dialog).getByRole("gridcell",{name:"12 ноября 2026 г."}));await user.click(within(dialog).getByRole("button",{name:"Выбрать"}));
 await waitFor(()=>expect(field).toHaveValue("2026-11-12"));expect(field).toBeValid();expect(submitted).not.toHaveBeenCalled();
});

it("selects a yearless leap birthday in a nested dialog without submitting the parent",async()=>{
 const submitted=vi.fn();function Editor(){const [value,setValue]=useState("--02-28");return <Dialog title="Contact" onClose={()=>{}}><form onSubmit={event=>{event.preventDefault();submitted();}}><Input aria-label="Birthday" allowUnknownYear type="date" min="1900-01-01" max="2026-11-11" value={value} onChange={event=>setValue(event.target.value)}/></form></Dialog>;}
 render(<Editor/>);const user=userEvent.setup();await user.click(screen.getByRole("button",{name:"Выбрать дату… Birthday"}));const picker=screen.getByRole("dialog",{name:"Выбрать дату…"});
 expect(within(picker).getByRole("checkbox",{name:"Год рождения неизвестен"})).toBeChecked();
 const day=within(picker).getByRole("gridcell",{name:"28 февраля"});day.focus();await user.keyboard("{ArrowRight}");await user.click(within(picker).getByRole("button",{name:"Выбрать"}));
 await waitFor(()=>expect(screen.getByRole("textbox",{name:"Birthday"})).toHaveValue("--02-29"));expect(submitted).not.toHaveBeenCalled();
});

it("uses the account's twelve-hour clock and retains time step validation",async()=>{
 function Editor(){const [value,setValue]=useState("16:15");return <PreferencesContext value={{settings:{...mockSettings,time_format:"12h"} as Settings,updateSettings:()=>{}}}><Input type="time" aria-label="Time" value={value} step={900} onChange={event=>setValue(event.target.value)}/></PreferencesContext>;}
 render(<Editor/>);const user=userEvent.setup();await user.click(screen.getByRole("button",{name:"Выбрать время… Time"}));const picker=screen.getByRole("dialog");
 const hours=within(picker).getByRole("spinbutton",{name:"Часы"});expect(hours).toHaveValue(4);
 await user.clear(hours);await user.type(hours,"5");await user.click(within(picker).getByRole("radio",{name:"До полудня"}));await user.click(within(picker).getByRole("button",{name:"Выбрать"}));
 await waitFor(()=>expect(screen.getByRole("textbox",{name:"Time"})).toHaveValue("05:15"));
 const field=screen.getByRole("textbox",{name:"Time"});await user.clear(field);await user.type(field,"05:16");expect(field).toBeInvalid();
});
