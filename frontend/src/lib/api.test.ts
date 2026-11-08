import {afterEach,expect,it,vi} from "vitest";
import {api,ApiError} from "./api";
import {clearRequestCooldowns} from "@/systems/loading/retry";
afterEach(()=>{clearRequestCooldowns();vi.unstubAllGlobals();vi.useRealTimers();});
it("blocks both refresh and query variants without sending another request after a failure",async()=>{
 vi.useFakeTimers();vi.setSystemTime(0);
 const fetch=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({error:{code:"internal_error"}}),{status:500})).mockResolvedValue(new Response(JSON.stringify({offers:[]}),{status:200}));vi.stubGlobal("fetch",fetch);
 await expect(api("/videogames")).rejects.toMatchObject({status:500,retryAt:30_000});
 await expect(api("/videogames/refresh",{method:"POST"})).rejects.toMatchObject({code:"request_cooldown"});
 await expect(api("/videogames?q=other")).rejects.toBeInstanceOf(ApiError);expect(fetch).toHaveBeenCalledOnce();
 vi.setSystemTime(30_001);await expect(api("/videogames")).resolves.toEqual({offers:[]});expect(fetch).toHaveBeenCalledTimes(2);
});
it("respects gateway Retry-After even when the response is HTML",async()=>{
 vi.useFakeTimers();vi.setSystemTime(0);
 const fetch=vi.fn().mockResolvedValue(new Response("limited",{status:429,headers:{"Retry-After":"600"}}));vi.stubGlobal("fetch",fetch);
 await expect(api("/videogames")).rejects.toMatchObject({status:429,retryAt:600_000});
 await expect(api("/profile")).rejects.toMatchObject({code:"request_cooldown"});expect(fetch).toHaveBeenCalledOnce();
});
it("a paused Epic provider never blocks reading integrations, editing keys or another provider",async()=>{
 vi.useFakeTimers();vi.setSystemTime(0);
 const fetch=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({error:{code:"rate_limited"}}),{status:429,headers:{"Retry-After":"600"}})).mockImplementation(()=>Promise.resolve(new Response("[]",{status:200})));vi.stubGlobal("fetch",fetch);
 await expect(api("/integrations/epic/connect",{method:"POST"})).rejects.toMatchObject({status:429,retryAt:600_000});
 await expect(api("/integrations")).resolves.toEqual([]);
 await expect(api("/integrations/epic",{method:"PUT",body:{revision:1}})).resolves.toEqual([]);
 await expect(api("/integrations/steam",{method:"PUT",body:{revision:1}})).resolves.toEqual([]);
 await expect(api("/integrations/steam/sync",{method:"POST"})).resolves.toEqual([]);
 await expect(api("/integrations/epic/authorize",{method:"POST",body:{code:"example"}})).rejects.toMatchObject({code:"request_cooldown",retryAt:600_000});
 expect(fetch).toHaveBeenCalledTimes(5);
});
it("network failures on a local save pause only that operation, not disconnect or metadata reads",async()=>{
 const fetch=vi.fn().mockRejectedValueOnce(new TypeError("offline")).mockImplementation(()=>Promise.resolve(new Response("[]",{status:200})));vi.stubGlobal("fetch",fetch);
 await expect(api("/integrations/epic",{method:"PUT"})).rejects.toThrow();
 await expect(api("/integrations/epic",{method:"PUT"})).rejects.toMatchObject({code:"request_cooldown"});
 await expect(api("/integrations")).resolves.toEqual([]);
 await expect(api("/integrations/epic",{method:"DELETE"})).resolves.toEqual([]);
 expect(fetch).toHaveBeenCalledTimes(3);
});
