import type { MaritalStatus, ProfileInput } from "./profile-input"

/**
 * The public projection of a profile. This is the only place that decides what a
 * visitor is allowed to see, and it is pure on purpose: the privacy rules are the
 * part of the profile that must never depend on how a page happens to render.
 *
 * Every sensitive field is off until its own switch is on. A blank text field is
 * nothing at all rather than an empty label, and `based_in` carries no switch —
 * the typed value is the consent (see docs/specs/profile.md).
 */

export interface ProfileRow {
  display_name: string
  batch_year: number | null
  bio: string | null
  profession: string | null
  based_in: string | null
  birth_month: number | null
  birth_day: number | null
  birth_year: number | null
  birthday_visible: number
  birth_year_visible: number
  marital_status: MaritalStatus | null
  marital_visible: number
  social_facebook: string | null
  social_instagram: string | null
  social_tiktok: string | null
  avatar_key: string | null
  avatar_then_key: string | null
  avatar_then_visible: number
  cover_key: string | null
  open_to_meetups: number
  listed_in_batch: number
}

export interface ProfileSocials {
  facebook: string | null
  instagram: string | null
  tiktok: string | null
}

export interface ProfileView {
  displayName: string
  batchYear: number | null
  bio: string | null
  profession: string | null
  basedIn: string | null
  birthMonth: number | null
  birthDay: number | null
  birthYear: number | null
  maritalStatus: MaritalStatus | null
  socials: ProfileSocials
  avatarKey: string | null
  avatarThenKey: string | null
  coverKey: string | null
  openToMeetups: boolean
  listedInBatch: boolean
}

function textOrNull(value: string | null): string | null {
  const trimmed = value?.trim() ?? ""

  return trimmed === "" ? null : trimmed
}

function isOn(flag: number): boolean {
  return flag === 1
}

export function toProfileView(row: ProfileRow): ProfileView {
  const showBirthday = isOn(row.birthday_visible)

  return {
    displayName: row.display_name,
    batchYear: row.batch_year,
    bio: textOrNull(row.bio),
    profession: textOrNull(row.profession),
    basedIn: textOrNull(row.based_in),
    birthMonth: showBirthday ? row.birth_month : null,
    birthDay: showBirthday ? row.birth_day : null,
    birthYear: isOn(row.birth_year_visible) ? row.birth_year : null,
    maritalStatus: isOn(row.marital_visible) ? row.marital_status : null,
    socials: {
      facebook: textOrNull(row.social_facebook),
      instagram: textOrNull(row.social_instagram),
      tiktok: textOrNull(row.social_tiktok),
    },
    avatarKey: textOrNull(row.avatar_key),
    avatarThenKey: isOn(row.avatar_then_visible) ? textOrNull(row.avatar_then_key) : null,
    coverKey: textOrNull(row.cover_key),
    openToMeetups: isOn(row.open_to_meetups),
    listedInBatch: isOn(row.listed_in_batch),
  }
}

/**
 * The same row as the member's own editor sees it: switching nothing off, and
 * switches as booleans rather than 1 and 0. This is what a save round-trips.
 */
export function toEditableProfile(row: ProfileRow): ProfileInput {
  return {
    displayName: row.display_name,
    batchYear: row.batch_year,
    bio: row.bio,
    profession: row.profession,
    basedIn: row.based_in,
    birthMonth: row.birth_month,
    birthDay: row.birth_day,
    birthYear: row.birth_year,
    birthdayVisible: isOn(row.birthday_visible),
    birthYearVisible: isOn(row.birth_year_visible),
    avatarThenVisible: isOn(row.avatar_then_visible),
    maritalStatus: row.marital_status,
    maritalVisible: isOn(row.marital_visible),
    socials: {
      facebook: row.social_facebook,
      instagram: row.social_instagram,
      tiktok: row.social_tiktok,
    },
    openToMeetups: isOn(row.open_to_meetups),
    listedInBatch: isOn(row.listed_in_batch),
  }
}
