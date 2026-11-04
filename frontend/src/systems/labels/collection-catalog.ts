import {t} from "@/systems/i18n/locale";
export type CollectionKind="toy"|"emotion"|"setting";
export const collectionPresets:Record<CollectionKind,string[]>={
 toy:["Вибратор","Массажёр","Стимулятор","Мастурбатор","Кольцо","Анальная пробка","Фаллоимитатор","Наручники","Повязка на глаза"],
 emotion:["Удовольствие","Расслабление","Радость","Близость","Нежность","Возбуждение","Спокойствие","Усталость","Смущение","Разочарование"],
 setting:["Дома","Спальня","Ванная","Отель","Уединённая обстановка","Романтическая обстановка","Спонтанно"]
};
export function collectionLabel(value:string){return Object.values(collectionPresets).some(items=>items.includes(value))?t(value):value;}
