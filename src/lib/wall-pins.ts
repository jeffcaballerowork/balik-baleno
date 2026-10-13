import { env } from "cloudflare:workers"

import { z } from "zod"

import { WALL_CONFIG } from "../config"

import type { Note } from "../data/mock"

import { hashOwnerToken } from "./owner-hash"

import { getManilaDate } from "./wall-date"

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
  user_id: z.string().nullable(),
  created_at: z.string(),
  edited_at: z.string().nullable(),
  hidden: z.number().int(),
})

type PinRow = z.infer<typeof pinRowSchema>

type ReactionRow = z.infer<typeof reactionRowSchema>

export interface WallPin extends Omit<
  Note,
  "id" | "reactionCounts" | "myReactions"
> {
  id: string
  zIndex: number
  canMove: boolean
  canEdit: boolean
  canDelete: boolean
  edited: boolean
  hidden: boolean
  reactionCounts: ReactionCounts
  myReactions: ReactionState
}

function toNote(
  row: PinRow,
  viewerUserId: string | null,
  isModerator: boolean,
  now: number,
  isCurrentWall: boolean,
  reactionCounts: ReactionCounts,
  myReactions: ReactionState,
): WallPin {
  const drawing = row.drawing_json
    ? z.array(z.string()).parse(JSON.parse(row.drawing_json))
    : undefined

  const image = row.image_key?.startsWith("https://images.unsplash.com/")
    ? row.image_key
    : undefined
  const createdAt = Date.parse(row.created_at)
  const isOwner = viewerUserId !== null && row.user_id !== null && row.user_id === viewerUserId
  const withinWindow =
    Number.isFinite(createdAt) &&
    createdAt <= now &&
    now - createdAt <= WALL_CONFIG.pinMoveWindowMs
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
      row.hidden === 0 &&
      (isModerator || (isOwner && withinWindow)),
    canEdit: isOwner && withinWindow && row.hidden === 0,
    canDelete: isOwner || isModerator,
    edited: row.edited_at !== null,
    hidden: row.hidden === 1,
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

export async function getWallPins(
  wallDate: string,
  deviceToken: string | null,
  viewerUserId: string | null = null,
  options: { includeHidden?: boolean; isModerator?: boolean } = {},
): Promise<WallPin[]> {
  const now = Date.now()
  const isCurrentWall = wallDate === getManilaDate()
  const isModerator = options.isModerator ?? false
  const includeHidden = (options.includeHidden ?? false) && isModerator
  let ownerHash: string | null = null

  if (deviceToken) {
    if (!env.OWNER_HASH_SALT) {
      throw new Error("OWNER_HASH_SALT is required for device-specific wall data.")
    }
    ownerHash = await hashOwnerToken(deviceToken, env.OWNER_HASH_SALT)
  }

  const pinResult = await env.DB.prepare(
    `SELECT id, kind, body, author_name, x_pct, y_pct, rotation, z_index,
            color, font, ink, doodle, drawing_json, image_key, owner_hash,
            user_id, created_at, edited_at, hidden
     FROM pins
     WHERE wall_date = ? AND status = 'active'${includeHidden ? "" : " AND hidden = 0"}
     ORDER BY created_at ASC, z_index ASC`,
  )
    .bind(wallDate)
    .all<PinRow>()

  const rows: PinRow[] = pinResult.results.map((row: unknown) =>
    pinRowSchema.parse(row),
  )

  const reactionResult = await env.DB.prepare(
    `SELECT pin_id, kind, COUNT(*) AS count,
            SUM(CASE WHEN voter_hash = ? THEN 1 ELSE 0 END) AS reacted
     FROM reactions
     WHERE pin_id IN (
       SELECT id FROM pins WHERE wall_date = ? AND status = 'active'${includeHidden ? "" : " AND hidden = 0"}
     )
     GROUP BY pin_id, kind`,
  )
    .bind(ownerHash, wallDate)
    .all<ReactionRow>()

  const reactionRows: ReactionRow[] = reactionResult.results.map(
    (row: unknown) => reactionRowSchema.parse(row),
  )
  const groupedReactions = new Map<string, ReactionRow[]>()

  for (const reaction of reactionRows) {
    const existing = groupedReactions.get(reaction.pin_id) ?? []
    existing.push(reaction)
    groupedReactions.set(reaction.pin_id, existing)
  }

  return rows.map((row) => {
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

    return toNote(row, viewerUserId, isModerator, now, isCurrentWall, counts, state)
  })
}
