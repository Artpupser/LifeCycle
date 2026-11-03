export type HolidayKind = "public" | "bank" | "optional" | "school" | "observance";
export type HolidayObservance = {
  country: string;
  date: string;
  through: string;
  kind: HolidayKind;
  substitute: boolean;
};
/** A holiday is one object; countries and their dates belong to that object. */
export type Holiday = {
  id: string;
  name: {ru: string; en: string};
  countries: string[];
  scope: "countries" | "international";
  source: string;
  observances: HolidayObservance[];
};
export type HolidayYear = {year: number; countries: string[]; holidays: Holiday[]};
export type HolidayOccurrence = {holiday: Holiday; date: string; through: string; countries: string[]; kinds: HolidayKind[]; substitute: boolean};
export const firstHolidayYear = 1970;
export const lastHolidayYear = 2080;
