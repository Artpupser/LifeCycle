import {expect,it} from "vitest";
import {setLanguage} from "@/systems/i18n/locale";
import {filterGames} from "./filters";
import type {Offer,Game,Sale} from "./types";
const offer=(id:string,platform:string,ownership:Offer["ownership"],free=false):Offer=>({id,platform,title:id,app_id:null,price:free?"0.00":"1.00",regular_price:"20.00",currency:"USD",discount_basis_points:free?10000:9500,free,url:"https://store.steampowered.com/app/10/",claim_url:"https://store.steampowered.com/app/10/",source:"cheapshark",ends_at:null,ownership});
const offers=[offer("Portal","steam","verified"),offer("Unknown game","steam","unknown",true),offer("Free gift","epic","marked",true)];
const game:Game={provider:"steam",id:"10",name:"Portal",playtime_minutes:60,recent_minutes:0,last_played_at:null,store_url:"https://store.steampowered.com/app/10/"};
it("combines platform, free and verified/manual ownership through the shared query",()=>{
 expect(filterGames("platform:steam owned:yes",offers,[game],[]).offers.map(o=>o.id)).toEqual(["Portal"]);
 expect(filterGames("free:yes owned:yes",offers,[],[]).offers.map(o=>o.id)).toEqual(["Free gift"]);
 expect(filterGames("type:library Portal",offers,[game],[]).library).toEqual([game]);
 expect(filterGames("type:library",offers,[game],[]).offers).toEqual([]);
 expect(filterGames("owned:no",offers,[],[]).offers).toEqual([]);
 expect(filterGames("-owned:yes",offers,[],[]).offers.map(o=>o.id)).toEqual(["Unknown game"]);
 expect(filterGames("discount:>95",offers,[],[]).offers).toHaveLength(2);
});
it("handles Russian aliases, invalid queries and localized sale names",async()=>{
 expect(filterGames("площадка:epic бесплатно:да",offers,[],[]).offers).toHaveLength(1);
 expect(filterGames("unknown:yes",offers,[game],[]).offers).toEqual([]);
 const sale={id:"winter",platform:"steam",title:"Зимняя распродажа Steam 2026",title_en:"Steam Winter Sale 2026",starts_at:"2026-12-17T18:00:00Z",ends_at:"2027-01-04T18:00:00Z",source:"https://partner.steamgames.com/",verified_on:"2026-11-08"} satisfies Sale;
 await setLanguage("en");expect(filterGames("type:sales Winter",[],[],[sale]).sales).toEqual([sale]);await setLanguage("ru");
});
