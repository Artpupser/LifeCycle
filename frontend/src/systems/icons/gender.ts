import {t} from "@/systems/i18n/locale";
export const genders=["unspecified","female","male","other"] as const;
export type Gender=typeof genders[number];
export const genderIcons={female:"tabler:gender-female",male:"tabler:gender-male",other:"tabler:gender-bigender",unspecified:"tabler:user"};
export const genderName=(gender:Gender|undefined)=>t(({female:"Женский",male:"Мужской",other:"Другой",unspecified:"Не указан"})[gender??"unspecified"]);
export const genderIcon=(gender:Gender|undefined)=>genderIcons[gender??"unspecified"];
