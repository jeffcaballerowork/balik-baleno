
import { env } from "cloudflare:workers"
import { z } from "zod"

import { AUTH_CONFIG, type UserRole, type UserStatus } from "../config"

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

const sessionPayloadSchema = z.object({
  id: z.string().uuid(),
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
})

const oauthStatePayloadSchema = z.object({
  state: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  nonce: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  verifier: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  returnTo: z.string().startsWith("/"),
  expiresAt: z.number().int().positive(),
})

const userSchema = z.object({
  id: z.string().uuid(),
  google_subject: z.string().min(1),
  email: z.string().email(),
  display_name: z.string().min(1).max(120),
  role: z.enum(AUTH_CONFIG.roles),
  status: z.enum(AUTH_CONFIG.statuses),
  batch_year: z.number().int().nullable(),
  join_note: z.string().nullable(),
  codename: z.string().nullable(),
  codename_updated_at: z.string().nullable(),
  birth_month: z.number().int().nullable(),
  birth_day: z.number().int().nullable(),
  birthday_visible: z.number().int().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type AuthUser = {
  id: string
  googleSubject: string
  email: string
  displayName: string
  role: UserRole
  status: UserStatus
  batchYear: number | null
  joinNote: string | null
  codename: string | null
  codenameUpdatedAt: string | null
  birthMonth: number | null
  birthDay: number | null
  birthdayVisible: boolean
  createdAt: string
  updatedAt: string
}

type UserRow = z.infer<typeof userSchema>

interface SessionRow extends UserRow {
  session_id: string
}

interface GoogleTokenResponse {
  id_token: string
}

const googleTokenResponseSchema = z.object({
  id_token: z.string().min(1),
})

const googleIdTokenHeaderSchema = z.object({
  alg: z.literal("RS256"),
  kid: z.string().min(1),
})

const googleIdTokenPayloadSchema = z.object({
  iss: z.union([
    z.literal("https://accounts.google.com"),
    z.literal("accounts.google.com"),
  ]),
  aud: z.union([z.string(), z.array(z.string())]),
  exp: z.number().int(),
  sub: z.string().min(1),
  email: z.string().email(),
  email_verified: z.boolean(),
  name: z.string().min(1).max(120).optional(),
  nonce: z.string().min(1),
})

const googleJwkSchema = z.object({
  kid: z.string().min(1),
  kty: z.literal("RSA"),
  n: z.string().min(1),
  e: z.string().min(1),
  alg: z.literal("RS256").optional(),
  use: z.literal("sig").optional(),
})

const googleJwksSchema = z.object({
  keys: z.array(googleJwkSchema),
})

function base64UrlEncode(value: Uint8Array): string {
  let binary = ""

  for (const byte of value) binary += String.fromCharCode(byte)

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "")
}

function base64UrlDecode(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/u.test(value)) return null

  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=")

  try {
    const binary = atob(padded)

    return Uint8Array.from(binary, character => character.charCodeAt(0))
  } catch {
    return null
  }
}

function toArrayBuffer(value: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(value.byteLength)

  copy.set(value)

  return copy.buffer
}

function jsonFromBase64Url(value: string): unknown | null {
  const bytes = base64UrlDecode(value)

  if (!bytes) return null

  try {
    return JSON.parse(textDecoder.decode(bytes)) as unknown
  } catch {
    return null
  }
}

function randomToken(): string {
  const bytes = new Uint8Array(32)

  crypto.getRandomValues(bytes)

  return base64UrlEncode(bytes)
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(value))

  return base64UrlEncode(new Uint8Array(digest))
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(value))

  return base64UrlEncode(new Uint8Array(signature))
}

async function verifySignature(value: string, signature: string, secret: string): Promise<boolean> {
  const signatureBytes = base64UrlDecode(signature)

  if (!signatureBytes) return false

  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  )

  return crypto.subtle.verify("HMAC", key, toArrayBuffer(signatureBytes), textEncoder.encode(value))
}

function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    googleSubject: row.google_subject,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    batchYear: row.batch_year,
    joinNote: row.join_note,
    codename: row.codename,
    codenameUpdatedAt: row.codename_updated_at,
    birthMonth: row.birth_month,
    birthDay: row.birth_day,
    birthdayVisible: row.birthday_visible === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function getCookie(request: Request, name: string): string | null {
  const entry = request.headers
    .get("Cookie")
    ?.split(";")
    .map(value => value.trim())
    .find(value => value.startsWith(`${name}=`))

  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null
}

function isHttpsRequest(request: Request): boolean {
  return new URL(request.url).protocol === "https:"
}

export function getCookieOptions(request: Request, maxAge?: number) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: isHttpsRequest(request),
    ...(maxAge === undefined ? {} : { maxAge }),
  }
}

export function hasAuthSecrets(): boolean {
  return Boolean(
    env.GOOGLE_OAUTH_CLIENT_ID &&
      env.GOOGLE_OAUTH_CLIENT_SECRET &&
      env.SESSION_COOKIE_SECRET,
  )
}

export async function createCsrfToken(request: Request): Promise<{ token: string; signedValue: string }> {
  const token = randomToken()

  return {
    token,
    signedValue: `${token}.${await sign(token, env.SESSION_COOKIE_SECRET)}`,
  }
}

export async function verifyCsrfRequest(request: Request): Promise<boolean> {
  const requestOrigin = request.headers.get("Origin")
  const expectedOrigin = new URL(request.url).origin
  const csrfToken = request.headers.get("X-CSRF-Token")
  const signedCookie = getCookie(request, AUTH_CONFIG.csrfCookieName)

  if (!requestOrigin || requestOrigin !== expectedOrigin || !csrfToken || !signedCookie) {
    return false
  }

  const separator = signedCookie.lastIndexOf(".")

  if (separator === -1) return false

  const token = signedCookie.slice(0, separator)
  const signature = signedCookie.slice(separator + 1)

  return token === csrfToken && verifySignature(token, signature, env.SESSION_COOKIE_SECRET)
}

export async function createSession(userId: string): Promise<{ cookieValue: string; expiresAt: string }> {
  const id = crypto.randomUUID()
  const token = randomToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + AUTH_CONFIG.sessionLifetimeMs).toISOString()

  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, userId, await sha256(token), expiresAt, now.toISOString(), now.toISOString())
    .run()

  const value = `${id}.${token}`

  return { cookieValue: `${value}.${await sign(value, env.SESSION_COOKIE_SECRET)}`, expiresAt }
}

export async function getSessionUser(request: Request): Promise<AuthUser | null> {
  const signedCookie = getCookie(request, AUTH_CONFIG.sessionCookieName)

  if (!signedCookie || !env.SESSION_COOKIE_SECRET) return null

  const separator = signedCookie.lastIndexOf(".")

  if (separator === -1) return null

  const value = signedCookie.slice(0, separator)
  const signature = signedCookie.slice(separator + 1)

  if (!(await verifySignature(value, signature, env.SESSION_COOKIE_SECRET))) return null

  const [id, token] = value.split(".")
  const parsed = sessionPayloadSchema.safeParse({ id, token })

  if (!parsed.success) return null

  const row = await env.DB.prepare(
    `SELECT
       u.id, u.google_subject, u.email, u.display_name, u.role, u.status,
       u.batch_year, u.join_note, u.codename, u.codename_updated_at,
       u.birth_month, u.birth_day, u.birthday_visible,
       u.created_at, u.updated_at, s.id AS session_id
     FROM sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.id = ? AND s.token_hash = ? AND s.expires_at > ?`,
  )
    .bind(parsed.data.id, await sha256(parsed.data.token), new Date().toISOString())
    .first<SessionRow>()

  if (!row) return null

  const user = userSchema.safeParse(row)

  return user.success ? toAuthUser(user.data) : null
}

export async function deleteSession(request: Request): Promise<void> {
  const signedCookie = getCookie(request, AUTH_CONFIG.sessionCookieName)

  if (!signedCookie || !env.SESSION_COOKIE_SECRET) return

  const separator = signedCookie.lastIndexOf(".")

  if (separator === -1) return

  const value = signedCookie.slice(0, separator)
  const signature = signedCookie.slice(separator + 1)

  if (!(await verifySignature(value, signature, env.SESSION_COOKIE_SECRET))) return

  const [id] = value.split(".")

  if (z.string().uuid().safeParse(id).success) {
    await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run()
  }
}

export async function createOAuthState(returnTo: string): Promise<{
  state: string
  nonce: string
  verifier: string
  cookieValue: string
}> {
  const state = randomToken()
  const payload = {
    state,
    nonce: randomToken(),
    verifier: randomToken(),
    returnTo,
    expiresAt: Date.now() + AUTH_CONFIG.oauthStateLifetimeMs,
  }
  const value = base64UrlEncode(textEncoder.encode(JSON.stringify(payload)))

  return {
    state,
    nonce: payload.nonce,
    verifier: payload.verifier,
    cookieValue: `${value}.${await sign(value, env.SESSION_COOKIE_SECRET)}`,
  }
}

export async function consumeOAuthState(request: Request, state: string): Promise<z.infer<typeof oauthStatePayloadSchema> | null> {
  const signedCookie = getCookie(request, AUTH_CONFIG.oauthStateCookieName)

  if (!signedCookie || !env.SESSION_COOKIE_SECRET) return null

  const separator = signedCookie.lastIndexOf(".")

  if (separator === -1) return null

  const value = signedCookie.slice(0, separator)
  const signature = signedCookie.slice(separator + 1)

  if (!(await verifySignature(value, signature, env.SESSION_COOKIE_SECRET))) return null

  const payload = oauthStatePayloadSchema.safeParse(jsonFromBase64Url(value))

  if (!payload.success || payload.data.state !== state || payload.data.expiresAt < Date.now()) {
    return null
  }

  return payload.data
}

export async function pkceChallenge(verifier: string): Promise<string> {
  return sha256(verifier)
}

export async function exchangeGoogleCode(code: string, redirectUri: string, verifier: string): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    code,
    code_verifier: verifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  })
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  if (!response.ok) throw new Error("Google rejected the authorization code.")

  const parsed = googleTokenResponseSchema.safeParse(await response.json())

  if (!parsed.success) throw new Error("Google returned an invalid token response.")

  return parsed.data
}

export async function verifyGoogleIdToken(idToken: string, nonce: string): Promise<{ subject: string; email: string; displayName: string }> {
  const [encodedHeader, encodedPayload, encodedSignature, ...extra] = idToken.split(".")

  if (!encodedHeader || !encodedPayload || !encodedSignature || extra.length > 0) {
    throw new Error("Google returned a malformed ID token.")
  }

  const header = googleIdTokenHeaderSchema.safeParse(jsonFromBase64Url(encodedHeader))
  const payload = googleIdTokenPayloadSchema.safeParse(jsonFromBase64Url(encodedPayload))
  const signature = base64UrlDecode(encodedSignature)

  if (!header.success || !payload.success || !signature) {
    throw new Error("Google returned an invalid ID token.")
  }

  const keysResponse = await fetch("https://www.googleapis.com/oauth2/v3/certs")

  if (!keysResponse.ok) throw new Error("Google signing keys are temporarily unavailable.")

  const keys = googleJwksSchema.safeParse(await keysResponse.json())
  const jwk = keys.success ? keys.data.keys.find(key => key.kid === header.data.kid) : undefined

  if (!jwk) throw new Error("Google ID token key was not found.")

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  )
  const isValid = await crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    toArrayBuffer(signature),
    textEncoder.encode(`${encodedHeader}.${encodedPayload}`),
  )
  const audience = Array.isArray(payload.data.aud) ? payload.data.aud : [payload.data.aud]

  if (
    !isValid ||
    !audience.includes(env.GOOGLE_OAUTH_CLIENT_ID) ||
    payload.data.nonce !== nonce ||
    payload.data.exp * 1000 <= Date.now() ||
    !payload.data.email_verified
  ) {
    throw new Error("Google ID token verification failed.")
  }

  return {
    subject: payload.data.sub,
    email: payload.data.email,
    displayName: payload.data.name ?? payload.data.email.split("@")[0] ?? "Baleno alum",
  }
}

export async function findOrCreateGoogleUser(identity: { subject: string; email: string; displayName: string }): Promise<AuthUser> {
  const now = new Date().toISOString()
  const id = crypto.randomUUID()

  await env.DB.prepare(
    `INSERT INTO users (
       id, google_subject, email, display_name, role, status,
       batch_year, join_note, birth_month, birth_day, birthday_visible, created_at, updated_at
     ) VALUES (?, ?, ?, ?, 'alum', 'pending', NULL, NULL, NULL, NULL, 0, ?, ?)
     -- display_name is the member's to edit in the profile, so signing in
     -- again must not put the Google name back.
     ON CONFLICT(google_subject) DO UPDATE SET
       email = excluded.email,
       updated_at = excluded.updated_at`,
  )
    .bind(id, identity.subject, identity.email, identity.displayName, now, now)
    .run()

  const row = await env.DB.prepare(
    `SELECT id, google_subject, email, display_name, role, status,
            batch_year, join_note, codename, codename_updated_at,
            birth_month, birth_day, birthday_visible,
            created_at, updated_at
     FROM users WHERE google_subject = ?`,
  )
    .bind(identity.subject)
    .first<UserRow>()
  const parsed = userSchema.safeParse(row)

  if (!parsed.success) throw new Error("Authenticated user could not be read.")

  return toAuthUser(parsed.data)
}

export function serializeUser(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    batchYear: user.batchYear,
    codename: user.codename,
    birthMonth: user.birthMonth,
    birthDay: user.birthDay,
    birthdayVisible: user.birthdayVisible,
  }
}

export function isAdmin(user: AuthUser): boolean {
  return user.role === "super_admin" || user.role === "admin"
}

export function isApproved(user: AuthUser): boolean {
  return user.status === "approved"
}

export const codenameSchema = z
  .string()
  .trim()
  .min(AUTH_CONFIG.codenameMinLength)
  .max(AUTH_CONFIG.codenameMaxLength)
  .regex(/^[A-Za-z0-9 _-]+$/)
