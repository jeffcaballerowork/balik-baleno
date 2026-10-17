import { env } from "cloudflare:workers"

import { type BatchNoteRow, type BatchSummary, summariseBatch } from "./batch"

/**
 * The batch directory's reads. Every query here filters on `status = 'approved'`,
 * and the member lists also filter on `listed_in_batch = 1`, so the numbers and
 * the grid are drawn from the same rows.
 */

export interface BatchMember {
  id: string
  display_name: string
  batch_year: number | null
  avatar_key: string | null
}

export interface BatchYear {
  year: number
  count: number
}

export async function listBatchMembers(batchYear: number): Promise<BatchMember[]> {
  const result = await env.DB.prepare(
    `SELECT id, display_name, batch_year, avatar_key
     FROM users
     WHERE batch_year = ? AND status = 'approved' AND listed_in_batch = 1
     ORDER BY display_name COLLATE NOCASE, id`,
  )
    .bind(batchYear)
    .all<BatchMember>()

  return result.results
}

export async function batchStats(batchYear: number): Promise<BatchSummary> {
  const members = await env.DB.prepare(
    "SELECT listed_in_batch FROM users WHERE batch_year = ? AND status = 'approved'",
  )
    .bind(batchYear)
    .all<{ listed_in_batch: number }>()

  const notes = await env.DB.prepare(
    `SELECT p.hidden AS hidden
     FROM pins p
     JOIN users u ON u.id = p.user_id
     WHERE u.batch_year = ? AND u.status = 'approved' AND p.status = 'active'`,
  )
    .bind(batchYear)
    .all<BatchNoteRow>()

  return summariseBatch({ members: members.results, notes: notes.results })
}

/**
 * Only years somebody is actually listed in, so the index cannot advertise a
 * year that opens onto an empty page.
 */
export async function listBatchYears(): Promise<BatchYear[]> {
  const result = await env.DB.prepare(
    `SELECT batch_year AS year, COUNT(*) AS count
     FROM users
     WHERE status = 'approved' AND listed_in_batch = 1 AND batch_year IS NOT NULL
     GROUP BY batch_year
     ORDER BY batch_year DESC`,
  ).all<BatchYear>()

  return result.results
}
