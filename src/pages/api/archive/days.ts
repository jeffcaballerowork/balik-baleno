import type { APIRoute } from "astro"

import { env } from "cloudflare:workers"

import { z } from "zod"

import {
  errorResponse,
  jsonResponse,
  logApiError,
} from "../../../lib/api-response"

export const prerender = false

const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .refine((month) => {
    const year = Number(month.slice(0, 4))
    return year >= 1000 && year < 9999
  })

const archiveDaySchema = z.object({
  date: z.string(),
  count: z.number().int().positive(),
})

export const GET: APIRoute = async ({ url }) => {
  const requestedMonth = url.searchParams.get("month")
  const parsedMonth = monthSchema.safeParse(requestedMonth)

  if (!parsedMonth.success) {
    return errorResponse(
      400,
      "invalid_month",
      "The archive month must be in YYYY-MM format.",
    )
  }

  const startDate = `${parsedMonth.data}-01`
  const endDate = new Date(`${startDate}T00:00:00.000Z`)
  endDate.setUTCMonth(endDate.getUTCMonth() + 1)
  const exclusiveEndDate = endDate.toISOString().slice(0, 10)

  try {
    const result = await env.DB.prepare(
      `SELECT wall_date AS date, COUNT(*) AS count
       FROM pins
       WHERE wall_date >= ? AND wall_date < ? AND status = 'active'
       GROUP BY wall_date
       ORDER BY wall_date ASC`,
    )
      .bind(startDate, exclusiveEndDate)
      .all()

    const days = result.results.map((row: unknown) =>
      archiveDaySchema.parse(row),
    )

    return jsonResponse({ month: parsedMonth.data, days })
  } catch (error) {
    logApiError("GET /api/archive/days", error)

    return errorResponse(
      500,
      "archive_days_unavailable",
      "Archive days could not be loaded right now.",
    )
  }
}
