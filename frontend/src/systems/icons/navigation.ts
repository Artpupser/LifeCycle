import {t} from "@/systems/i18n/locale";
export const navigationCatalog=[
  {to:"/labels",label:"Теги и категории",icon:"tabler:tags"},
  {to:"/today",label:"Сегодня",icon:"tabler:sun"},
  {to:"/habits",label:"Привычки",icon:"tabler:seedling"},
  {to:"/workouts",label:"Тренировки",icon:"tabler:barbell"},
  {to:"/sex",label:"Интимный журнал",icon:"tabler:heart"},
  {to:"/tasks",label:"Задачи",icon:"tabler:clipboard-list"},
  {to:"/calendar",label:"Календарь",icon:"tabler:calendar"},
  {to:"/notes",label:"Заметки",icon:"tabler:notebook"},
  {to:"/countdowns",label:"Отсчёты",icon:"tabler:hourglass"},
  {to:"/contacts",label:"Контакты",icon:"tabler:address-book"},
  {to:"/pomodoro",label:"Pomodoro",icon:"tabler:clock-play"},
  {to:"/analytics",label:"Аналитика",icon:"tabler:chart-bar"},
  {to:"/ai",label:"AI-помощник",icon:"tabler:brain"},
  {to:"/profile",label:"Профиль",icon:"tabler:user"},
  {to:"/settings",label:"Настройки",icon:"tabler:adjustments-horizontal"},
  {to:"/status",label:"Подключение",icon:"tabler:server"},
] as const;
export function navigationItems(authenticated:boolean) {
  const items=authenticated?navigationCatalog:[{to:"/login",label:"Войти",icon:"tabler:key"},navigationCatalog[navigationCatalog.length-1]];
  return items.map(item=>({...item,label:t(item.label)}));
}
