import type { APIRoute } from "astro"

import { env } from "cloudflare:workers"

import {
  errorResponse,
  jsonResponse,
  logApiError,
} from "../../../lib/api-response"

import { getWallPins } from "../../../lib/wall-pins"

import { wallDateSchema } from "../../../lib/wall-date"

export const prerender = false

export const GET: APIRoute = async ({ params, request }) => {
  const parsedDate = wallDateSchema.safeParse(params.date)

  if (!parsedDate.success) {
    return errorResponse(
      400,
      "invalid_date",
      "The archive date must be a valid YYYY-MM-DD date.",
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
      "Archive notes could not be loaded right now.",
    )
  }

  try {
    const pins = await getWallPins(parsedDate.data, deviceToken)

    return jsonResponse({
      date: parsedDate.data,
      count: pins.length,
      pins,
    })
  } catch (error) {
    logApiError("GET /api/archive/:date", error)

    return errorResponse(
      500,
      "archive_unavailable",
      "Archive notes could not be loaded right now.",
    )
  }
}
