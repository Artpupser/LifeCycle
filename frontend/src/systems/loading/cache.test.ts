import {afterEach,expect,it,vi} from "vitest";
import {clearResourceCache,loadResource,resourceSnapshot,subscribeResource,invalidateResources} from "./cache";
afterEach(clearResourceCache);
it("deduplicates readers and keeps ready content visible during refresh errors",async()=>{
 const loader=vi.fn().mockResolvedValue(["saved"]);await Promise.all([loadResource("/notes",loader,String),loadResource("/notes",loader,String)]);expect(loader).toHaveBeenCalledOnce();
 let fail!:(error:Error)=>void;const refreshing=loadResource("/notes",()=>new Promise((_,reject)=>{fail=reject;}),String,true);expect(resourceSnapshot("/notes").resource).toEqual({status:"ready",data:["saved"]});await Promise.resolve();fail(new Error("offline"));await refreshing;expect(resourceSnapshot("/notes").resource).toEqual({status:"ready",data:["saved"]});expect(resourceSnapshot("/notes").error).toContain("offline");
});
it("ignores a response from a previous authenticated session",async()=>{
 let resolve!:(value:unknown)=>void;const request=loadResource("/contacts",()=>new Promise(done=>{resolve=done;}),String);await Promise.resolve();clearResourceCache();resolve(["private"]);await request;expect(resourceSnapshot("/contacts").resource.status).toBe("loading");
});
it("refetches an invalidated in-flight read instead of displaying stale pre-save data",async()=>{
 let resolve!:(value:unknown)=>void;const loader=vi.fn().mockImplementationOnce(()=>new Promise(done=>{resolve=done;})).mockResolvedValue(["new"]);const unsubscribe=subscribeResource("/tasks",()=>{});const request=loadResource("/tasks",loader,String);await Promise.resolve();invalidateResources();resolve(["old"]);await request;await vi.waitFor(()=>expect(resourceSnapshot("/tasks").resource).toEqual({status:"ready",data:["new"]}));expect(loader).toHaveBeenCalledTimes(2);unsubscribe();
});
