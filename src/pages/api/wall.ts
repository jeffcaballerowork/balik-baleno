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

import type { Note } from "../../data/mock"

export const prerender = false

const noteKinds = ["sticky", "torn", "notebook", "polaroid", "card"] as const

const noteColors = ["yellow", "pink", "blue", "green", "mustard"] as const

const noteFonts = ["hand", "serif"] as const

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
})

type PinRow = z.infer<typeof pinRowSchema>

interface WallNote extends Omit<Note, "id"> {
  id: string
  zIndex: number
}

function toNote(row: PinRow): WallNote {
  const drawing = row.drawing_json
    ? z.array(z.string()).parse(JSON.parse(row.drawing_json))
    : undefined

  const image = row.image_key?.startsWith("https://images.unsplash.com/")
    ? row.image_key
    : undefined
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

    color: row.color ?? undefined,

    image,

    doodle: row.doodle ?? undefined,

    drawing,

    ink: row.ink === defaultInk ? undefined : row.ink,

    font: row.font === "hand" ? undefined : row.font,
  }
}

export const GET: APIRoute = async ({ url }) => {
  const requestedDate = url.searchParams.get("date") ?? getManilaDate()

  const parsedDate = wallDateSchema.safeParse(requestedDate)

  if (!parsedDate.success) {
    return errorResponse(
      400,

      "invalid_date",

      "The wall date must be a valid YYYY-MM-DD date.",
    )
  }

  try {
    const result = await env.DB.prepare(
      `SELECT id, kind, body, author_name, x_pct, y_pct, rotation, z_index,
              color, font, ink, doodle, drawing_json, image_key
       FROM pins
       WHERE wall_date = ? AND status = 'active'
       ORDER BY created_at ASC, z_index ASC`,
    )

      .bind(parsedDate.data)

      .all<PinRow>()

    const pins = result.results.map((row: unknown) =>
      toNote(pinRowSchema.parse(row)),
    )

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
