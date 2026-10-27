export type MedicalKey = "conditions" | "daily_medications" | "past_medications" | "surgeries";
export type Profile = {
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

export type ProfileDraft = Omit<Profile, MedicalKey> & Record<MedicalKey, string>;
export type NumericProfileKey = { [K in keyof Profile]: Profile[K] extends number | null ? K : never }[keyof Profile];
export const medicalKeys: MedicalKey[] = ["conditions", "daily_medications", "past_medications", "surgeries"];

export function profileToDraft(profile: Profile): ProfileDraft {
  return { ...profile, conditions: profile.conditions.join("\n"), daily_medications: profile.daily_medications.join("\n"), past_medications: profile.past_medications.join("\n"), surgeries: profile.surgeries.join("\n") };
}

export function draftToProfile(draft: ProfileDraft): Profile {
  const lines = (value: string) => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return { ...draft, conditions: lines(draft.conditions), daily_medications: lines(draft.daily_medications), past_medications: lines(draft.past_medications), surgeries: lines(draft.surgeries) };
}
