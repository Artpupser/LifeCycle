// @vitest-environment jsdom
import {it,expect,vi} from "vitest";
import {renderHook,act,waitFor} from "@testing-library/react";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import type {ReactNode} from "react";
import {useAction} from "./use-action";
it("serializes submissions and settles a failed mutation before the next successful action",async()=>{
 const settled=vi.fn(),client=new QueryClient({defaultOptions:{mutations:{retry:false}}});
 const {result,unmount}=renderHook(()=>useAction({notifyError:false,settled}),{wrapper:({children}:{children:ReactNode})=><QueryClientProvider client={client}>{children}</QueryClientProvider>});
 let reject!:(error:Error)=>void;let first!:Promise<boolean>;const duplicate=vi.fn();
 await act(async()=>{first=result.current.run(()=>new Promise((_,fail)=>{reject=fail;}));expect(await result.current.run(duplicate)).toBe(false);});
 expect(duplicate).not.toHaveBeenCalled();await waitFor(()=>expect(result.current.busy).toBe(true));
 await act(async()=>{reject(new Error("offline"));expect(await first).toBe(false);});
 await waitFor(()=>expect(result.current.error).toBeTruthy());const completed=vi.fn();
 await act(async()=>{expect(await result.current.run(async()=>"saved",completed)).toBe(true);});
 await waitFor(()=>expect(result.current.error).toBeNull());expect(completed).toHaveBeenCalledOnce();expect(settled).toHaveBeenCalledTimes(2);unmount();client.clear();
});
