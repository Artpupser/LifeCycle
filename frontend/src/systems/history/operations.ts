import {t} from "@/systems/i18n/locale";
export const operationNames:Record<string,string>={created:"Создано",updated:"Изменено",deleted:"Удалено",changed:"Действие выполнено"};
export function operationLabel(value:string){const code=Object.hasOwn(operationNames,value)?value:/deleted$/.test(value)?"deleted":/created$|started$/.test(value)?"created":/updated$|changed$/.test(value)?"updated":"changed";return t(operationNames[code]);}
export function historySection(value:string){return ({integrations:"profile",task:"tasks",habit:"habits",note:"notes",folder:"notes",workout:"workouts",workout_session:"workouts",exercise:"workouts",countdown:"countdowns"} as Record<string,string>)[value]??value;}
