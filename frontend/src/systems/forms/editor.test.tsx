// @vitest-environment jsdom
import {it,expect,vi} from "vitest";
import {render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {useState} from "react";
import {EditorForm} from "./editor";
import {useEditorState} from "./use-editor";
import {editorSchemas} from "./schemas";
import {Input} from "@/components/ui/input";
import {SaveButton} from "@/components/ui/save";
import {Dialog} from "@/components/dialog";
it("validates the current RHF draft through Zod before submitting",async()=>{
 const saved=vi.fn();function Editor(){const [value,setValue,editor]=useEditorState({title:""},editorSchemas.titled);return <EditorForm editor={editor} onSubmit={()=>saved(value)}><Input aria-label="Title" value={value.title} onChange={event=>setValue({title:event.target.value})}/><SaveButton type="submit">Save</SaveButton></EditorForm>;}
 render(<Editor/>);const user=userEvent.setup();await user.click(screen.getByRole("button",{name:"Save"}));expect(saved).not.toHaveBeenCalled();expect(await screen.findByRole("alert")).toBeInTheDocument();
 await user.type(screen.getByRole("textbox",{name:"Title"}),"A task");await user.click(screen.getByRole("button",{name:"Save"}));await waitFor(()=>expect(saved).toHaveBeenCalledWith({title:"A task"}));
});
it("keeps portaled save controls disabled by the original fieldset in a Radix dialog",async()=>{
 function Editor(){const [blocked,setBlocked]=useState(true);const [value,setValue,editor]=useEditorState({title:"Saved"},editorSchemas.titled);return <Dialog title="Editor" onClose={()=>{}}><EditorForm editor={editor}><fieldset disabled={blocked}><Input aria-label="Title" value={value.title} onChange={event=>setValue({title:event.target.value})}/><SaveButton type="submit">Save</SaveButton></fieldset><button type="button" onClick={()=>setBlocked(false)}>Unlock</button></EditorForm></Dialog>;}
 render(<Editor/>);expect(await screen.findByRole("button",{name:"Save"})).toBeDisabled();await userEvent.click(screen.getByRole("button",{name:"Unlock"}));await waitFor(()=>expect(screen.getByRole("button",{name:"Save"})).toBeEnabled());
});
it("isolates a nested portal editor so it cannot submit its parent form",async()=>{
 const outer=vi.fn(),inner=vi.fn();
 function Child(){const [value,,editor]=useEditorState({title:"Child"},editorSchemas.titled);return <Dialog title="Child" onClose={()=>{}}><EditorForm editor={editor} onSubmit={()=>inner(value)}><SaveButton type="submit">Save child</SaveButton></EditorForm></Dialog>;}
 function Parent(){const [value,,editor]=useEditorState({title:"Parent"},editorSchemas.titled);return <EditorForm editor={editor} onSubmit={()=>outer(value)}><Child/></EditorForm>;}
 render(<Parent/>);await userEvent.click(screen.getByRole("button",{name:"Save child"}));await waitFor(()=>expect(inner).toHaveBeenCalledOnce());expect(outer).not.toHaveBeenCalled();
});
