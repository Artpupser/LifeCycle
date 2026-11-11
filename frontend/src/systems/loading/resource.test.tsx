// @vitest-environment jsdom
import {afterAll,afterEach,beforeAll,it,expect} from "vitest";
import {http,HttpResponse} from "msw";
import {render,screen,waitFor} from "@testing-library/react";
import {useEffect} from "react";
import {QueryClientProvider} from "@tanstack/react-query";
import {server} from "@/testing/server";
import {queryClient,clearResourceCache,revalidateResource} from "./cache";
import {clearRequestCooldowns} from "./retry";
import {useResource} from "@/hooks/use-resource";
beforeAll(()=>server.listen({onUnhandledFrame:"error"}));afterAll(()=>server.close());afterEach(()=>{server.resetHandlers();clearResourceCache();clearRequestCooldowns();});
it("shares one network read across consumers and revalidates through the Query owner",async()=>{
 let reads=0;server.use(http.get("*/api/notes",()=>HttpResponse.json([`read-${++reads}`])));
 function Consumer(){const {resource}=useResource<string[]>("/notes");return <p>{resource.status==="ready"?resource.data[0]:resource.status}</p>;}
 render(<QueryClientProvider client={queryClient}><Consumer/><Consumer/></QueryClientProvider>);
 await waitFor(()=>expect(screen.getAllByText("read-1")).toHaveLength(2));expect(reads).toBe(1);revalidateResource("/notes");await waitFor(()=>expect(screen.getAllByText("read-2")).toHaveLength(2));expect(reads).toBe(2);
});

it("keeps the same ready snapshot when a background refresh fails",async()=>{
 const snapshots:unknown[]=[];server.use(http.get("*/api/notes",()=>HttpResponse.json(["saved"])));
 function Consumer(){const {resource,refreshError}=useResource<string[]>("/notes");useEffect(()=>{snapshots.push(resource);},[resource]);return <p>{resource.status==="ready"?(refreshError?"refresh-error":"saved"):resource.status}</p>;}
 render(<QueryClientProvider client={queryClient}><Consumer/></QueryClientProvider>);await screen.findByText("saved");const ready=snapshots.at(-1);
 server.use(http.get("*/api/notes",()=>HttpResponse.json({error:{code:"unavailable"}},{status:503})));revalidateResource("/notes");await screen.findByText("refresh-error");expect(snapshots.at(-1)).toBe(ready);expect(snapshots.filter(item=>(item as {status:string}).status==="ready")).toHaveLength(1);
});
