import type { APIRoute } from "astro"

import { env } from "cloudflare:workers"

import { z } from "zod"

import { WALL_CONFIG } from "../../config"

import {
  errorResponse,
  jsonResponse,
  logApiError,
} from "../../lib/api-response"

import {
  getManilaDate,
  getWallResetAt,
  wallDateSchema,
} from "../../lib/wall-date"

import { hashOwnerToken } from "../../lib/owner-hash"

import type { Note } from "../../data/mock"

export const prerender = false

const noteKinds = ["sticky", "torn", "notebook", "polaroid", "card"] as const

const noteColors = ["yellow", "pink", "blue", "green", "mustard"] as const

const noteFonts = ["hand", "serif"] as const

const reactionKinds = ["love", "relate", "nostalgia"] as const

type ReactionKind = (typeof reactionKinds)[number]

type ReactionCounts = Record<ReactionKind, number>

type ReactionState = Record<ReactionKind, boolean>

const reactionRowSchema = z.object({
  pin_id: z.string(),
  kind: z.enum(reactionKinds),
  count: z.number().int().nonnegative(),
  reacted: z.number().int().nonnegative(),
})

const pinRowSchema = z.object({
  id: z.string(),

  kind: z.enum(noteKinds),

  body: z.string(),

  author_name: z.string().nullable(),

  x_pct: z.number(),
  y_pct: z.number(),
  rotation: z.number(),
  z_index: z.number(),

  color: z.enum(noteColors).nullable(),

  font: z.enum(noteFonts),

  ink: z.string(),

  doodle: z.string().nullable(),

  drawing_json: z.string().nullable(),

  image_key: z.string().nullable(),

  owner_hash: z.string(),

  created_at: z.string(),
})

type PinRow = z.infer<typeof pinRowSchema>

interface WallNote extends Omit<Note, "id"> {
  id: string
  zIndex: number
  canMove: boolean
  reactionCounts: ReactionCounts
  myReactions: ReactionState
}

interface ReactionRow {
  pin_id: string
  kind: ReactionKind
  count: number
  reacted: number
}

function toNote(
  row: PinRow,
  ownerHash: string | null,
  now: number,
  isCurrentWall: boolean,
  reactionCounts: ReactionCounts,
  myReactions: ReactionState,
): WallNote {
  const drawing = row.drawing_json
    ? z.array(z.string()).parse(JSON.parse(row.drawing_json))
    : undefined

  const image = row.image_key?.startsWith("https://images.unsplash.com/")
    ? row.image_key
    : undefined
  const createdAt = Date.parse(row.created_at)
  const defaultInk =
    row.kind === "card"
      ? row.color === "mustard"
        ? "#fff8e9"
        : "#fff2d9"
      : "#1b1a5f"

  return {
    id: row.id,

    kind: row.kind,

    text: row.body,

    author: row.author_name ?? "Anonymous",

    x: (row.x_pct / 100) * WALL_CONFIG.logicalCanvasWidth,

    y: (row.y_pct / 100) * WALL_CONFIG.logicalCanvasHeight,

    rotation: row.rotation,

    zIndex: row.z_index,

    canMove:
      isCurrentWall &&
      ownerHash !== null &&
      row.owner_hash === ownerHash &&
      Number.isFinite(createdAt) &&
      createdAt <= now &&
      now - createdAt <= WALL_CONFIG.pinMoveWindowMs,

    reactionCounts,

    myReactions,

    color: row.color ?? undefined,

    image,

    doodle: row.doodle ?? undefined,

    drawing,

    ink: row.ink === defaultInk ? undefined : row.ink,

    font: row.font === "hand" ? undefined : row.font,
  }
}

export const GET: APIRoute = async ({ url, request }) => {
  const requestedDate = url.searchParams.get("date") ?? getManilaDate()

  const parsedDate = wallDateSchema.safeParse(requestedDate)

  if (!parsedDate.success) {
    return errorResponse(
      400,

      "invalid_date",

      "The wall date must be a valid YYYY-MM-DD date.",
    )
  }

  const deviceToken = request.headers.get("x-device-token")

  if (deviceToken !== null && !/^[a-f0-9]{64}$/.test(deviceToken)) {
    return errorResponse(
      400,
      "invalid_device_token",
      "The device token is invalid.",
    )
  }

  if (deviceToken !== null && !env.OWNER_HASH_SALT) {
    return errorResponse(
      500,
      "server_misconfigured",
      "The wall could not be loaded right now.",
    )
  }

  try {
    const now = Date.now()
    const isCurrentWall = parsedDate.data === getManilaDate()
    const ownerHash =
      deviceToken && env.OWNER_HASH_SALT
        ? await hashOwnerToken(deviceToken, env.OWNER_HASH_SALT)
        : null
    const result = await env.DB.prepare(
      `SELECT id, kind, body, author_name, x_pct, y_pct, rotation, z_index,
              color, font, ink, doodle, drawing_json, image_key, owner_hash,
              created_at
       FROM pins
       WHERE wall_date = ? AND status = 'active'
       ORDER BY created_at ASC, z_index ASC`,
    )

      .bind(parsedDate.data)

      .all<PinRow>()

    const rows: PinRow[] = result.results.map((row: unknown) =>
      pinRowSchema.parse(row),
    )

    const reactionResult = await env.DB.prepare(
      `SELECT pin_id, kind, COUNT(*) AS count,
              SUM(CASE WHEN voter_hash = ? THEN 1 ELSE 0 END) AS reacted
       FROM reactions
       WHERE pin_id IN (
         SELECT id FROM pins WHERE wall_date = ? AND status = 'active'
       )
       GROUP BY pin_id, kind`,
    )
      .bind(ownerHash, parsedDate.data)
      .all<ReactionRow>()

    const groupedReactions = new Map<string, ReactionRow[]>()

    const reactionRows: ReactionRow[] = reactionResult.results.map(
      (row: unknown) => reactionRowSchema.parse(row),
    )

    for (const reaction of reactionRows) {
      const existing = groupedReactions.get(reaction.pin_id) ?? []
      existing.push(reaction)
      groupedReactions.set(reaction.pin_id, existing)
    }

    const pins = rows.map((row) => {
      const counts: ReactionCounts = { love: 0, relate: 0, nostalgia: 0 }
      const state: ReactionState = {
        love: false,
        relate: false,
        nostalgia: false,
      }

      for (const reaction of groupedReactions.get(row.id) ?? []) {
        counts[reaction.kind] = reaction.count
        state[reaction.kind] = reaction.reacted > 0
      }

      return toNote(
        row,
        ownerHash,
        now,
        isCurrentWall,
        counts,
        state,
      )
    })

    return jsonResponse({
      pins,

      resetsAt: getWallResetAt(parsedDate.data),
    })
  } catch (error) {
    logApiError("GET /api/wall", error)

    return errorResponse(
      500,

      "wall_unavailable",

      "The wall could not be loaded right now.",
    )
  }
}
