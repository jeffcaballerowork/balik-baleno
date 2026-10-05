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

const pinIdSchema = z.string().min(1).max(64)

const reportInputSchema = z.object({
  deviceToken: z.string().regex(/^[a-f0-9]{64}$/),
})

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

  const parsed = reportInputSchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse(
      400,
      "invalid_report",
      "The report details are invalid.",
    )
  }

  if (!env.OWNER_HASH_SALT) {
    return errorResponse(
      500,
      "server_misconfigured",
      "The report could not be submitted.",
    )
  }

  try {
    const reportId = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    const reporterHash = await hashOwnerToken(
      parsed.data.deviceToken,
      env.OWNER_HASH_SALT,
    )
    const result = await env.DB.prepare(
      `INSERT INTO reports (id, pin_id, reporter_hash, created_at)
       SELECT ?, ?, ?, ?
       WHERE EXISTS (
         SELECT 1 FROM pins WHERE id = ? AND status = 'active'
       )`,
    )
      .bind(
        reportId,
        parsedId.data,
        reporterHash,
        createdAt,
        parsedId.data,
      )
      .run()

    if (result.meta.changes !== 1) {
      return errorResponse(
        404,
        "pin_not_found",
        "This note is no longer available.",
      )
    }

    return jsonResponse(
      {
        id: reportId,
        pinId: parsedId.data,
        createdAt,
      },
      201,
    )
  } catch (error) {
    logApiError("POST /api/pins/:id/report", error)

    return errorResponse(
      500,
      "report_unavailable",
      "The report could not be submitted.",
    )
  }
}
