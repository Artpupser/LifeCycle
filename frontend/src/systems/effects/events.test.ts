import {afterEach,expect,it,vi} from "vitest";
import {configureEffects,effectEvents,mutationEffect,showEffect} from "./events";
afterEach(()=>configureEffects(true));
it("distinguishes saved completion, creation, deletion and a reversed result",()=>{
 expect(mutationEffect("/tasks/t/occurrences/2026-11-03","POST",{status:"completed"},{})).toBe("complete");
 expect(mutationEffect("/habits/h/marks/2026-11-03","POST",{status:"completed"},{habit_mark:{status:"completed"}})).toBe("complete");
 expect(mutationEffect("/tasks/t","PUT",{status:"todo"},{status:"todo"})).toBeNull();
 expect(mutationEffect("/habits/h/marks/2026-11-03","POST",{status:"completed"},{status:"pending"})).toBe("notice");
 expect(mutationEffect("/notes","POST",{},{})).toBe("create");
 expect(mutationEffect("/notes/folders","POST",{},{})).toBe("create");
 expect(mutationEffect("/boards/b/columns","POST",{},{})).toBe("create");
 expect(mutationEffect("/pomodoro/configs","POST",{},{})).toBe("create");
 expect(mutationEffect("/contacts/c","DELETE",null,undefined)).toBe("remove");
 expect(mutationEffect("/notes","GET",undefined,[])).toBeNull();
 expect(mutationEffect("/auth/login","POST",{},{})).toBeNull();
 expect(mutationEffect("/ai/accounts/a","DELETE",null,undefined)).toBeNull();
});
it("suppresses every effect channel when disabled",()=>{
 const listener=vi.fn();effectEvents.addEventListener("effect",listener);
 configureEffects(false);for(const kind of ["complete","create","remove","notice","confirm","error"] as const)showEffect(kind);
 expect(listener).not.toHaveBeenCalled();
 configureEffects(true);showEffect("complete");expect(listener).toHaveBeenCalledOnce();
 effectEvents.removeEventListener("effect",listener);
});
