export const WALL_CONFIG = {
  dailyPinLimit: 200,

  dailyUserPinLimit: 2,

  pinMoveWindowMs: 10 * 60 * 1000,

  pinEditWindowMs: 10 * 60 * 1000,

  reportHideThreshold: 3,

  logicalCanvasWidth: 1480,

  logicalCanvasHeight: 1130,
} as const

export const AUTH_CONFIG = {
  sessionCookieName: "balik_session",

  csrfCookieName: "balik_csrf",

  oauthStateCookieName: "balik_oauth_state",

  sessionLifetimeMs: 30 * 24 * 60 * 60 * 1000,

  oauthStateLifetimeMs: 10 * 60 * 1000,

  joinNoteMaxLength: 500,

  batchYearMinimum: 1996,

  batchYearMaximum: 2026,

  codenameMinLength: 3,

  codenameMaxLength: 20,

  codenameChangeCooldownMs: 7 * 24 * 60 * 60 * 1000,

  roles: ["super_admin", "admin", "alum"] as const,

  statuses: ["pending", "approved", "declined", "suspended"] as const,
} as const

export type UserRole = (typeof AUTH_CONFIG.roles)[number]

export type UserStatus = (typeof AUTH_CONFIG.statuses)[number]

export const PROFILE_CONFIG = {
  maxDisplayNameLength: 120,

  maxProfessionLength: 80,

  maxBioLength: 400,

  maxBasedInLength: 60,

  maxCaptionLength: 80,

  maxGalleryPhotos: 6,

  maxInterests: 10,

  maxPhotoBytes: 2_000_000,

  birthYearMinimum: 1930,
} as const
