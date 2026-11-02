import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
export function parsePhone(value:string,country?:CountryCode){return parsePhoneNumberFromString(value,{defaultCountry:country,extract:false});}
export function possiblePhone(value:string,country?:CountryCode){return parsePhone(value,country)?.isPossible()??false;}
export function formatPhone(value:string,country?:CountryCode){const parsed=parsePhone(value,country);return parsed?.isPossible()?parsed.formatInternational():value;}
export const phoneKey=(value:string)=>value.replace(/\D/g,"").replace(/^00/,"");
