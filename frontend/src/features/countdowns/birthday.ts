import {withoutBirthYear} from "@/lib/dates";
import {eventCategory} from "@/systems/labels/categories";
import {resolveIcon} from "@/systems/icons/catalog";
import type {Countdown} from "./types";

type BirthdayContext=Pick<Countdown,"contact_birthday"|"category"|"icon">;
export const isBirthdayCountdown=(event:BirthdayContext)=>event.contact_birthday||eventCategory(event.category)==="birthday"||resolveIcon(event.icon)==="tabler:cake";
/** target_date is the civil birth date, including encrypted unlinked snapshots. */
export const countdownBirthDate=(event:BirthdayContext&Pick<Countdown,"suspended"|"target_date"|"birth_year_unknown">)=>isBirthdayCountdown(event)&&!event.suspended?event.birth_year_unknown&&event.target_date?withoutBirthYear(event.target_date):event.target_date:null;
