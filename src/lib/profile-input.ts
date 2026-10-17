import { z } from "zod"

import { AUTH_CONFIG, PROFILE_CONFIG } from "../config.ts"

/**
 * The shape of a saved profile, as it crosses the API boundary. Text is trimmed
 * here, so a field the member emptied arrives as NULL and the database never
 * holds a string that renders as an empty label.
 */

function optionalText(maxLength: number) {
  return z
    .string()
    .max(maxLength)
    .nullable()
    .transform(value => {
      const trimmed = value?.trim() ?? ""

      return trimmed === "" ? null : trimmed
    })
}

export const MARITAL_STATUSES = ["single", "married", "widowed", "separated"] as const

export type MaritalStatus = (typeof MARITAL_STATUSES)[number]

export const profileInputSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1)
    .max(PROFILE_CONFIG.maxDisplayNameLength),
  batchYear: z
    .number()
    .int()
    .min(AUTH_CONFIG.batchYearMinimum)
    .max(AUTH_CONFIG.batchYearMaximum)
    .nullable(),
  bio: optionalText(PROFILE_CONFIG.maxBioLength),
  profession: optionalText(PROFILE_CONFIG.maxProfessionLength),
  basedIn: optionalText(PROFILE_CONFIG.maxBasedInLength),
  birthMonth: z.number().int().min(1).max(12).nullable(),
  birthDay: z.number().int().min(1).max(31).nullable(),
  birthYear: z
    .number()
    .int()
    .min(PROFILE_CONFIG.birthYearMinimum)
    .max(AUTH_CONFIG.batchYearMaximum)
    .nullable(),
  birthdayVisible: z.boolean(),
  birthYearVisible: z.boolean(),
  avatarThenVisible: z.boolean(),
  maritalStatus: z.enum(MARITAL_STATUSES).nullable(),
  maritalVisible: z.boolean(),
  socials: z.object({
    facebook: optionalText(PROFILE_CONFIG.maxDisplayNameLength),
    instagram: optionalText(PROFILE_CONFIG.maxDisplayNameLength),
    tiktok: optionalText(PROFILE_CONFIG.maxDisplayNameLength),
  }),
  openToMeetups: z.boolean(),
  listedInBatch: z.boolean(),
})

export type ProfileInput = z.infer<typeof profileInputSchema>

/**
 * A gallery photo's caption and order. Both are optional so the editor can save
 * a caption without restating where the photo sits.
 */
export const galleryPhotoUpdateSchema = z.object({
  caption: optionalText(PROFILE_CONFIG.maxCaptionLength).optional(),
  position: z.number().int().min(0).max(999).optional(),
})

/** The starting point for a member who has filled in nothing except their name. */
export const blankProfileInput: z.input<typeof profileInputSchema> = {
  displayName: "Baleno alum",
  batchYear: null,
  bio: null,
  profession: null,
  basedIn: null,
  birthMonth: null,
  birthDay: null,
  birthYear: null,
  birthdayVisible: false,
  birthYearVisible: false,
  avatarThenVisible: false,
  maritalStatus: null,
  maritalVisible: false,
  socials: { facebook: null, instagram: null, tiktok: null },
  openToMeetups: false,
  listedInBatch: true,
}
