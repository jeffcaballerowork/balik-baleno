import { env } from "cloudflare:workers"

import { type InterestOption, slugify } from "./interests"

/**
 * Reading and writing the interest catalogue and a member's picks. The rules
 * live in `interests.ts`; this file only moves rows, and it keeps the
 * "only an active catalogue slug can be picked" rule in SQL where it cannot be
 * bypassed by a caller that forgets it.
 */

export async function listCatalogue(): Promise<InterestOption[]> {
  const result = await env.DB.prepare(
    `SELECT slug, label, group_name AS "group", sort
     FROM interests
     WHERE active = 1
     ORDER BY group_name, sort, label`,
  ).all<InterestOption>()

  return result.results
}

export async function listInterestGroups(): Promise<string[]> {
  const result = await env.DB.prepare(
    "SELECT DISTINCT group_name AS name FROM interests ORDER BY group_name",
  ).all<{ name: string }>()

  return result.results.map(row => row.name)
}

export async function getUserInterests(userId: string): Promise<InterestOption[]> {
  const result = await env.DB.prepare(
    `SELECT i.slug, i.label, i.group_name AS "group", i.sort
     FROM user_interests ui
     JOIN interests i ON i.slug = ui.slug
     WHERE ui.user_id = ?
     ORDER BY i.group_name, i.sort, i.label`,
  )
    .bind(userId)
    .all<InterestOption>()

  return result.results
}

/**
 * Replaces a member's whole set. The INSERT selects from `interests` and
 * demands `active = 1`, so an unknown or retired slug in the payload simply
 * does not land.
 */
export async function setUserInterests(userId: string, slugs: string[]): Promise<void> {
  const now = new Date().toISOString()
  const statements = [env.DB.prepare("DELETE FROM user_interests WHERE user_id = ?").bind(userId)]

  for (const slug of slugs) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO user_interests (user_id, slug, created_at)
         SELECT ?, slug, ? FROM interests WHERE slug = ? AND active = 1`,
      ).bind(userId, now, slug),
    )
  }

  await env.DB.batch(statements)
}

/** Idempotent: suggesting the same line twice leaves one pending row. */
export async function suggestInterest(userId: string, text: string): Promise<void> {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO interest_suggestions (id, user_id, text, status, created_at)
     VALUES (?, ?, ?, 'pending', ?)`,
  )
    .bind(crypto.randomUUID(), userId, text, new Date().toISOString())
    .run()
}

export interface InterestSuggestion {
  id: string
  user_id: string
  display_name: string
  text: string
  status: string
  created_at: string
  reviewed_at: string | null
}

export async function listPendingSuggestions(): Promise<InterestSuggestion[]> {
  const result = await env.DB.prepare(
    `SELECT s.id, s.user_id, u.display_name, s.text, s.status, s.created_at, s.reviewed_at
     FROM interest_suggestions s
     JOIN users u ON u.id = s.user_id
     WHERE s.status = 'pending'
     ORDER BY s.created_at`,
  ).all<InterestSuggestion>()

  return result.results
}

export async function getSuggestion(id: string): Promise<InterestSuggestion | null> {  const row = await env.DB.prepare(
    `SELECT s.id, s.user_id, u.display_name, s.text, s.status, s.created_at, s.reviewed_at
     FROM interest_suggestions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ?`,
  )
    .bind(id)
    .first<InterestSuggestion>()

  return row ?? null
}

/** How many lines this member already has waiting for an admin. */
export async function countPendingSuggestions(userId: string): Promise<number> {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM interest_suggestions WHERE user_id = ? AND status = 'pending'",
  )
    .bind(userId)
    .first<{ total: number }>()

  return row?.total ?? 0
}

function auditStatement(
  actorId: string,
  action: string,
  targetUserId: string | null,
  targetId: string | null,
  details: unknown,
) {
  return env.DB.prepare(
    `INSERT INTO profile_audit (
       id, actor_user_id, action, target_user_id, target_id, details_json, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(),
    actorId,
    action,
    targetUserId,
    targetId,
    JSON.stringify(details),
    new Date().toISOString(),
  )
}

/**
 * Approving puts the phrase in the catalogue at the end of its group, so it is
 * pickable immediately with no deploy. Approving a phrase that already exists
 * reactivates it instead of failing, which is what a member would expect.
 */
export async function approveSuggestion(
  suggestion: InterestSuggestion,
  group: string,
  actorId: string,
): Promise<string | null> {
  const slug = slugify(suggestion.text)

  if (!slug) return null

  const now = new Date().toISOString()

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO interests (slug, label, group_name, sort, active, created_at)
       VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort), 0) + 10 FROM interests WHERE group_name = ?), 1, ?)
       ON CONFLICT(slug) DO UPDATE SET
         label = excluded.label,
         group_name = excluded.group_name,
         active = 1`,
    ).bind(slug, suggestion.text, group, group, now),
    env.DB.prepare(
      "UPDATE interest_suggestions SET status = 'approved', reviewed_by = ?, reviewed_at = ? WHERE id = ?",
    ).bind(actorId, now, suggestion.id),
    auditStatement(actorId, "interest_approved", suggestion.user_id, slug, {
      text: suggestion.text,
      group,
    }),
  ])

  return slug
}

export async function declineSuggestion(suggestion: InterestSuggestion, actorId: string): Promise<void> {
  const now = new Date().toISOString()

  await env.DB.batch([
    env.DB.prepare(
      "UPDATE interest_suggestions SET status = 'declined', reviewed_by = ?, reviewed_at = ? WHERE id = ?",
    ).bind(actorId, now, suggestion.id),
    auditStatement(actorId, "interest_declined", suggestion.user_id, suggestion.id, {
      text: suggestion.text,
    }),
  ])
}
