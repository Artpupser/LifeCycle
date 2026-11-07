import {t} from "@/systems/i18n/locale";
export const genders=["unspecified","female","male"] as const;
export type Gender=typeof genders[number]|"other";
export const normalizeGender=(gender:Gender|undefined)=>gender==="female"||gender==="male"?gender:"unspecified";
export const genderIcons={female:"tabler:gender-female",male:"tabler:gender-male",unspecified:"tabler:user"};
export const genderName=(gender:Gender|undefined)=>t(({female:"Женский",male:"Мужской",unspecified:"Не указан"})[normalizeGender(gender)]);
export const genderIcon=(gender:Gender|undefined)=>genderIcons[normalizeGender(gender)];
