import {t} from "@/systems/i18n/locale";
import {matchesFilter,parseFilterQuery,filterValue,type FilterSpec} from "@/lib/filter-query";
import {gamePlatforms,platformName,type Offer,type Game,type Sale} from "./types";
export function gameFilters():FilterSpec[]{return [
 {key:"type",aliases:["вид"],label:t("Что показать"),example:"type:offers",values:["offers","library","sales"],control:true},
 {key:"platform",aliases:["площадка"],label:t("Площадка"),example:"platform:steam",choices:gamePlatforms.map(platform=>({value:platform.id,label:platform.name,icon:platform.icon}))},
 {key:"free",aliases:["бесплатно"],label:t("Бесплатные игры"),example:"free:yes"},
 {key:"owned",aliases:["получено"],label:t("Уже в библиотеке"),example:"owned:yes"},
 {key:"discount",aliases:["скидка"],label:t("Скидка, %"),example:"discount:>90"},
 ];}
export function filterGames(query:string,offers:Offer[],library:Game[],sales:Sale[]){
 const filters=parseFilterQuery(query,gameFilters());const type=filterValue(filters,"type");
 return {
  offers:type&&type!=="offers"?[]:offers.filter(offer=>matchesFilter(filters,`${offer.title} ${platformName(offer.platform)}`,{type:"offers",platform:[offer.platform,platformName(offer.platform)],free:offer.free,owned:offer.ownership==="unknown"?null:["verified","marked"].includes(offer.ownership),discount:offer.discount_basis_points/100})),
  library:type&&type!=="library"?[]:library.filter(game=>matchesFilter(filters,`${game.name} ${platformName(game.provider)}`,{type:"library",platform:[game.provider,platformName(game.provider)],owned:true})),
  sales:type&&type!=="sales"?[]:sales.filter(sale=>matchesFilter(filters,`${t(sale.title)} ${sale.title_en} ${platformName(sale.platform)}`,{type:"sales",platform:[sale.platform,platformName(sale.platform)]})),
  showOffers:!type||type==="offers",showLibrary:!type||type==="library",showSales:!type||type==="sales",
 };
}
