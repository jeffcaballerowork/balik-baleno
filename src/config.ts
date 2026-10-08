export const WALL_CONFIG = {
  dailyPinLimit: 150,

  dailyDevicePinLimit: 5,

  pinMoveWindowMs: 10 * 60 * 1000,

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

  roles: ["super_admin", "admin", "alum"] as const,

  statuses: ["pending", "approved", "declined", "suspended"] as const,
} as const

export type UserRole = (typeof AUTH_CONFIG.roles)[number]

export type UserStatus = (typeof AUTH_CONFIG.statuses)[number]
