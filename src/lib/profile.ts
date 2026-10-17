import { env } from "cloudflare:workers"

import type { ProfileInput } from "./profile-input"
import { mediaUrl } from "./media"
import { type ProfileRow, type ProfileView, toProfileView } from "./profile-view"

/**
 * Reading and writing a profile. The visibility rules live in profile-view.ts;
 * this file only moves rows. Every write normalises blank text to NULL so the
 * "blank means hidden" rule holds in the database as well as in the projection.
 */

export const PROFILE_COLUMNS = `display_name, batch_year, bio, profession, based_in,
  birth_month, birth_day, birth_year, birthday_visible, birth_year_visible,
  marital_status, marital_visible, social_facebook, social_instagram, social_tiktok,
  avatar_key, avatar_then_key, avatar_then_visible, cover_key, open_to_meetups,
  listed_in_batch`

function textOrNull(value: string | null): string | null {
  const trimmed = value?.trim() ?? ""

  return trimmed === "" ? null : trimmed
}

function flag(value: boolean): number {
  return value ? 1 : 0
}

export async function getProfileRow(userId: string): Promise<ProfileRow | null> {
  const row = await env.DB.prepare(`SELECT ${PROFILE_COLUMNS} FROM users WHERE id = ?`)
    .bind(userId)
    .first<ProfileRow>()

  return row ?? null
}

export async function getProfileView(userId: string): Promise<ProfileView | null> {
  const row = await getProfileRow(userId)

  return row ? toProfileView(row) : null
}

export async function updateProfile(userId: string, input: ProfileInput): Promise<void> {
  await env.DB.prepare(
    `UPDATE users SET
       display_name = ?, batch_year = ?, bio = ?, profession = ?, based_in = ?,
       birth_month = ?, birth_day = ?, birth_year = ?,
       birthday_visible = ?, birth_year_visible = ?,
       marital_status = ?, marital_visible = ?,
       social_facebook = ?, social_instagram = ?, social_tiktok = ?,
       avatar_then_visible = ?,
       open_to_meetups = ?, listed_in_batch = ?, updated_at = datetime('now')
     WHERE id = ?`,
  )
    .bind(
      input.displayName.trim(),
      input.batchYear,
      textOrNull(input.bio),
      textOrNull(input.profession),
      textOrNull(input.basedIn),
      input.birthMonth,
      input.birthDay,
      input.birthYear,
      flag(input.birthdayVisible),
      flag(input.birthYearVisible),
      input.maritalStatus,
      flag(input.maritalVisible),
      textOrNull(input.socials.facebook),
      textOrNull(input.socials.instagram),
      textOrNull(input.socials.tiktok),
      flag(input.avatarThenVisible),
      flag(input.openToMeetups),
      flag(input.listedInBatch),
      userId,
    )
    .run()
}

/**
 * The three photos a member has exactly one of. The column name is chosen from a
 * fixed map rather than built from the request, so nothing user-supplied ever
 * reaches the SQL.
 */
export const SINGLE_PHOTO_COLUMNS = {
  cover: "cover_key",
  avatar: "avatar_key",
  avatar_then: "avatar_then_key",
} as const

export type SinglePhotoKind = keyof typeof SINGLE_PHOTO_COLUMNS

export function isSinglePhotoKind(value: string): value is SinglePhotoKind {
  return Object.hasOwn(SINGLE_PHOTO_COLUMNS, value)
}

export async function getSinglePhotoKey(userId: string, kind: SinglePhotoKind): Promise<string | null> {
  const column = SINGLE_PHOTO_COLUMNS[kind]
  const row = await env.DB.prepare(`SELECT ${column} AS key FROM users WHERE id = ?`)
    .bind(userId)
    .first<{ key: string | null }>()

  return row?.key ?? null
}

export async function setSinglePhotoKey(
  userId: string,
  kind: SinglePhotoKind,
  key: string | null,
): Promise<void> {
  const column = SINGLE_PHOTO_COLUMNS[kind]

  await env.DB.prepare(`UPDATE users SET ${column} = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(key, userId)
    .run()
}

export interface GalleryPhotoRow {
  id: string
  r2_key: string
  caption: string | null
  position: number
}

export async function listGalleryPhotos(userId: string): Promise<GalleryPhotoRow[]> {
  const result = await env.DB.prepare(
    "SELECT id, r2_key, caption, position FROM user_photos WHERE user_id = ? ORDER BY position, created_at",
  )
    .bind(userId)
    .all<GalleryPhotoRow>()

  return result.results
}

export async function countGalleryPhotos(userId: string): Promise<number> {
  const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM user_photos WHERE user_id = ?")
    .bind(userId)
    .first<{ total: number }>()

  return row?.total ?? 0
}

export async function addGalleryPhoto(
  userId: string,
  r2Key: string,
  caption: string | null,
): Promise<GalleryPhotoRow> {
  const next = await env.DB.prepare(
    "SELECT COALESCE(MAX(position), 0) + 1 AS position FROM user_photos WHERE user_id = ?",
  )
    .bind(userId)
    .first<{ position: number }>()

  const photo: GalleryPhotoRow = {
    id: crypto.randomUUID(),
    r2_key: r2Key,
    caption,
    position: next?.position ?? 1,
  }

  await env.DB.prepare(
    "INSERT INTO user_photos (id, user_id, r2_key, caption, position, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))",
  )
    .bind(photo.id, userId, photo.r2_key, photo.caption, photo.position)
    .run()

  return photo
}

/** Scoped to the owner: another member's photo id is simply not found. */
export async function getGalleryPhoto(userId: string, id: string): Promise<GalleryPhotoRow | null> {
  const row = await env.DB.prepare(
    "SELECT id, r2_key, caption, position FROM user_photos WHERE id = ? AND user_id = ?",
  )
    .bind(id, userId)
    .first<GalleryPhotoRow>()

  return row ?? null
}

export async function updateGalleryPhoto(
  id: string,
  caption: string | null,
  position: number,
): Promise<void> {
  await env.DB.prepare("UPDATE user_photos SET caption = ?, position = ? WHERE id = ?")
    .bind(caption, position, id)
    .run()
}

export async function deleteGalleryPhoto(id: string): Promise<void> {
  await env.DB.prepare("DELETE FROM user_photos WHERE id = ?").bind(id).run()
}

export interface ProfileReport {
  id: string
  reporter_name: string
  target_name: string
  target_id: string
  note: string | null
  created_at: string
}

/**
 * One row per reporter per target: reporting the same person twice updates the
 * note and puts the report back in the queue instead of piling up rows.
 */
export async function reportProfile(
  reporterId: string,
  targetId: string,
  note: string | null,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO profile_reports (id, reporter_id, target_id, note, status, created_at)
     VALUES (?, ?, ?, ?, 'open', ?)
     ON CONFLICT(reporter_id, target_id) DO UPDATE SET
       note = excluded.note,
       status = 'open',
       reviewed_by = NULL,
       reviewed_at = NULL,
       created_at = excluded.created_at`,
  )
    .bind(crypto.randomUUID(), reporterId, targetId, note, new Date().toISOString())
    .run()
}

export async function listOpenProfileReports(): Promise<ProfileReport[]> {
  const result = await env.DB.prepare(
    `SELECT r.id, reporter.display_name AS reporter_name, target.display_name AS target_name,
            target.id AS target_id, r.note, r.created_at
     FROM profile_reports r
     JOIN users reporter ON reporter.id = r.reporter_id
     JOIN users target ON target.id = r.target_id
     WHERE r.status = 'open'
     ORDER BY r.created_at`,
  ).all<ProfileReport>()

  return result.results
}

export async function closeProfileReport(id: string, actorId: string): Promise<ProfileReport | null> {
  const report = await env.DB.prepare(
    `SELECT r.id, reporter.display_name AS reporter_name, target.display_name AS target_name,
            target.id AS target_id, r.note, r.created_at
     FROM profile_reports r
     JOIN users reporter ON reporter.id = r.reporter_id
     JOIN users target ON target.id = r.target_id
     WHERE r.id = ? AND r.status = 'open'`,
  )
    .bind(id)
    .first<ProfileReport>()

  if (!report) return null

  const now = new Date().toISOString()

  await env.DB.batch([
    env.DB.prepare("UPDATE profile_reports SET status = 'closed', reviewed_by = ?, reviewed_at = ? WHERE id = ?")
      .bind(actorId, now, id),
    env.DB.prepare(
      `INSERT INTO profile_audit (
         id, actor_user_id, action, target_user_id, target_id, details_json, created_at
       ) VALUES (?, ?, 'profile_report_closed', ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      actorId,
      report.target_id,
      report.id,
      JSON.stringify({ targetName: report.target_name }),
      now,
    ),
  ])

  return report
}

export async function getUserExists(userId: string): Promise<boolean> {
  const row = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(userId).first<{ id: string }>()

  return row !== null
}

/** Who owns an R2 object, and whether the account still counts as approved. */
export async function getUserStatus(userId: string): Promise<string | null> {
  const row = await env.DB.prepare("SELECT status FROM users WHERE id = ?")
    .bind(userId)
    .first<{ status: string }>()

  return row?.status ?? null
}

export interface PublicGalleryPhoto {
  id: string
  url: string | null
  caption: string | null
}

export interface PublicProfile {
  view: ProfileView
  gallery: PublicGalleryPhoto[]
  status: string
}

/**
 * Everything the public profile page renders. The visibility rules stay in
 * `toProfileView`; the account status rides alongside so a suspended profile can
 * be shown as suspended rather than as an ordinary face.
 */
export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const row = await getProfileRow(userId)

  if (!row) return null

  const [gallery, status] = await Promise.all([listGalleryPhotos(userId), getUserStatus(userId)])

  return {
    view: toProfileView(row),
    gallery: gallery.map(photo => ({
      id: photo.id,
      url: mediaUrl(photo.r2_key),
      caption: photo.caption,
    })),
    status: status ?? "suspended",
  }
}
