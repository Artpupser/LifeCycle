export type Origin = { region: string; given_name: string; surname: string; patronymic: string; sex: "" | "unspecified" | "female" | "male" | "intersex" | "other"; childhood_languages: string[]; maternal_birth_order: number | null; multiple_birth_count: number | null };
export type Firsts = { school_entry_year: number | null; school_graduation_year: number | null; education: string; profession: string; job: string; residence_country: string; foreign_language: string; achievement: string; completed_project: string };
export type HabitPeriod = { id: string; start_date: string | null; end_date: string | null; note: string };
export type HarmfulHabit = { id: string; name: string; current: boolean | null; ever: boolean | null; periods: HabitPeriod[] };
export const emptyOrigin: Origin = { region: "", given_name: "", surname: "", patronymic: "", sex: "", childhood_languages: [], maternal_birth_order: null, multiple_birth_count: null };
export const emptyFirsts: Firsts = { school_entry_year: null, school_graduation_year: null, education: "", profession: "", job: "", residence_country: "", foreign_language: "", achievement: "", completed_project: "" };
export type MedicalKey = "conditions" | "daily_medications" | "past_medications" | "surgeries";
export type Profile = {
  revision: number;
  origin: Origin;
  firsts: Firsts;
  harmful_habits: HarmfulHabit[];
  nickname: string;
  name: string;
  gender: "unspecified" | "female" | "male" | "other";
  birth_date: string | null;
  birth_country: string;
  residence_country: string;
  height_cm: number | null;
  weight_kg: number | null;
  arms_count: number | null;
  legs_count: number | null;
  eye_color: string;
  hair_color: string;
  skin_color: string;
  colleagues_count: number | null;
  friends_count: number | null;
  acquaintances_count: number | null;
  conditions: string[];
  daily_medications: string[];
  past_medications: string[];
  surgeries: string[];
  has_family: boolean | null;
  has_partner: boolean | null;
  penis_length_cm: number | null;
  penis_width_cm: number | null;
  breast_size: string;
  pregnant: boolean | null;
};

export type ProfileDraft = Omit<Profile, MedicalKey | "origin"> & Record<MedicalKey, string> & { origin: Omit<Origin, "childhood_languages"> & { childhood_languages: string } };
export type NumericProfileKey = { [K in keyof Profile]: Profile[K] extends number | null ? K : never }[keyof Profile];
export const medicalKeys: MedicalKey[] = ["conditions", "daily_medications", "past_medications", "surgeries"];

export function profileToDraft(profile: Profile): ProfileDraft {
  return { ...profile, origin: { ...profile.origin, childhood_languages: profile.origin.childhood_languages.join("\n") }, conditions: profile.conditions.join("\n"), daily_medications: profile.daily_medications.join("\n"), past_medications: profile.past_medications.join("\n"), surgeries: profile.surgeries.join("\n") };
}

export function draftToProfile(draft: ProfileDraft): Profile {
  const lines = (value: string) => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return { ...draft, origin: { ...draft.origin, childhood_languages: lines(draft.origin.childhood_languages) }, conditions: lines(draft.conditions), daily_medications: lines(draft.daily_medications), past_medications: lines(draft.past_medications), surgeries: lines(draft.surgeries) };
}
