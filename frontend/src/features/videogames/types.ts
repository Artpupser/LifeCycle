import platforms from "../../../../shared/game-platforms.json";
export const gamePlatforms=platforms;
export type Game={provider:string;id:string;name:string;playtime_minutes:number|null;recent_minutes:number|null;last_played_at:string|null;store_url:string;preview?:string|null};
export type Offer={id:string;platform:string;title:string;app_id:string|null;price:string;regular_price:string|null;currency:string;discount_basis_points:number;free:boolean;url:string;claim_url:string;source:string;ends_at:string|null;preview?:string|null;price_unavailable?:boolean;price_country?:string|null;ownership:"verified"|"marked"|"unknown"|"absent"};
export type Sale={id:string;platform:string;title:string;title_en:string;starts_at:string;ends_at:string;source:string;verified_on:string;all_day?:boolean;stale?:boolean;kind?:"seasonal"|"giveaway"};
export type GameCatalog={country?:string|null;connected_platforms?:string[];unavailable_sales?:string[];offers:Offer[];library:Game[];stats:{games:number;played:number|null;playtime_minutes:number|null;recent_minutes:number|null;available:boolean};sales:Sale[];calendar_sales:string[];notify_free:boolean;checked_at:string|null;unavailable_sources:string[]};
export const platformName=(id:string)=>gamePlatforms.find(platform=>platform.id===id)?.name??id;
export const platformIcon=(id:string)=>gamePlatforms.find(platform=>platform.id===id)?.icon??"tabler:device-gamepad-2";
