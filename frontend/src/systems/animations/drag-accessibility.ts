import {Accessibility} from "@dnd-kit/dom";
import {t} from "@/systems/i18n/locale";
export function dragAccessibility(){return Accessibility.configure({announcements:{dragstart:()=>t("Перемещение начато."),dragend:(event:{canceled:boolean})=>t(event.canceled?"Перемещение отменено.":"Перемещение завершено.")},screenReaderInstructions:{draggable:t("Пробел — начать перемещение, стрелки — выбрать позицию, пробел — завершить, Escape — отменить.")}});}
