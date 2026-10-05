import type { APIRoute } from "astro"

import { env } from "cloudflare:workers"

import { z } from "zod"

import {
  errorResponse,
  jsonResponse,
  logApiError,
} from "../../../../lib/api-response"

import { hashOwnerToken } from "../../../../lib/owner-hash"

export const prerender = false

const reactionKinds = ["love", "relate", "nostalgia"] as const

type ReactionKind = (typeof reactionKinds)[number]

type ReactionCounts = Record<ReactionKind, number>

type ReactionState = Record<ReactionKind, boolean>

const pinIdSchema = z.string().min(1).max(64)

const reactionInputSchema = z.object({
  deviceToken: z.string().regex(/^[a-f0-9]{64}$/),
  kind: z.enum(reactionKinds),
})

const reactionRowSchema = z.object({
  kind: z.enum(reactionKinds),
  count: z.number().int().nonnegative(),
  reacted: z.number().int().nonnegative(),
})

type ReactionRow = z.infer<typeof reactionRowSchema>

export const POST: APIRoute = async ({ params, request }) => {
  const parsedId = pinIdSchema.safeParse(params.id)

  if (!parsedId.success) {
    return errorResponse(400, "invalid_pin_id", "The pin ID is invalid.")
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return errorResponse(
      400,
      "invalid_json",
      "The request body must be valid JSON.",
    )
  }

  const parsed = reactionInputSchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse(
      400,
      "invalid_reaction",
      "The reaction details are invalid.",
    )
  }

  if (!env.OWNER_HASH_SALT) {
    return errorResponse(
      500,
      "server_misconfigured",
      "Your reaction could not be saved.",
    )
  }

  try {
    const ownerHash = await hashOwnerToken(
      parsed.data.deviceToken,
      env.OWNER_HASH_SALT,
    )

    const pin = await env.DB.prepare(
      "SELECT id FROM pins WHERE id = ? AND status = 'active'",
    )
      .bind(parsedId.data)
      .first<{ id: string }>()

    if (!pin) {
      return errorResponse(
        404,
        "pin_not_found",
        "This note is no longer available.",
      )
    }

    await env.DB.batch([
      env.DB.prepare(
        `DELETE FROM reactions
         WHERE pin_id = ? AND kind = ? AND voter_hash = ?
           AND EXISTS (
             SELECT 1 FROM pins WHERE id = ? AND status = 'active'
           )`,
      ).bind(parsedId.data, parsed.data.kind, ownerHash, parsedId.data),
      env.DB.prepare(
        `INSERT INTO reactions (pin_id, kind, voter_hash)
         SELECT ?, ?, ?
         WHERE changes() = 0
           AND EXISTS (
             SELECT 1 FROM pins WHERE id = ? AND status = 'active'
           )
         ON CONFLICT (pin_id, kind, voter_hash) DO NOTHING`,
      ).bind(parsedId.data, parsed.data.kind, ownerHash, parsedId.data),
    ])

    const activePin = await env.DB.prepare(
      "SELECT id FROM pins WHERE id = ? AND status = 'active'",
    )
      .bind(parsedId.data)
      .first<{ id: string }>()

    if (!activePin) {
      return errorResponse(
        404,
        "pin_not_found",
        "This note is no longer available.",
      )
    }

    const reactionResult = await env.DB.prepare(
      `SELECT kind, COUNT(*) AS count,
              SUM(CASE WHEN voter_hash = ? THEN 1 ELSE 0 END) AS reacted
       FROM reactions
       WHERE pin_id = ?
       GROUP BY kind`,
    )
      .bind(ownerHash, parsedId.data)
      .all<ReactionRow>()

    const reactionCounts: ReactionCounts = {
      love: 0,
      relate: 0,
      nostalgia: 0,
    }
    const myReactions: ReactionState = {
      love: false,
      relate: false,
      nostalgia: false,
    }

    const reactionRows: ReactionRow[] = reactionResult.results.map(
      (row: unknown) => reactionRowSchema.parse(row),
    )

    for (const reaction of reactionRows) {
      reactionCounts[reaction.kind] = reaction.count
      myReactions[reaction.kind] = reaction.reacted > 0
    }

    return jsonResponse(
      {
        pinId: parsedId.data,
        reactionCounts,
        myReactions,
      },
      200,
    )
  } catch (error) {
    logApiError("POST /api/pins/:id/reactions", error)

    return errorResponse(
      500,
      "reaction_unavailable",
      "Your reaction could not be saved.",
    )
  }
}
