import { describe, expect, it } from "vitest";
import { draftToProfile, profileToDraft, type Profile } from "./types";

const profile: Profile = { nickname: "", name: "", gender: "unspecified", birth_date: null, birth_country: "", residence_country: "", height_cm: null, weight_kg: null, arms_count: null, legs_count: null, eye_color: "", hair_color: "", skin_color: "", colleagues_count: null, friends_count: null, acquaintances_count: null, conditions: [], daily_medications: [], past_medications: [], surgeries: [], has_family: null, has_partner: null, penis_length_cm: null, penis_width_cm: null, breast_size: "", pregnant: null };

describe("profile form serialization", () => {
  it("preserves the difference between unknown, zero, and false", () => {
    const source = { ...profile, friends_count: 0, has_family: false, conditions: ["Первая запись", "Вторая запись"] };
    expect(draftToProfile(profileToDraft(source))).toEqual(source);
  });

  it("normalizes list input without creating empty health records", () => {
    const draft = { ...profileToDraft(profile), conditions: "  Первая запись  \r\n\r\nВторая запись\n" };
    expect(draftToProfile(draft).conditions).toEqual(["Первая запись", "Вторая запись"]);
  });

  it("does not remove hidden personal fields when gender changes", () => {
    const draft = profileToDraft({ ...profile, gender: "male", pregnant: false, breast_size: "B" });
    expect(draftToProfile(draft)).toMatchObject({ pregnant: false, breast_size: "B" });
  });
});
