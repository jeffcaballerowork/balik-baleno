import { env } from "cloudflare:workers"

import type { APIRoute } from "astro"

import { getSessionUser, isApproved } from "../../lib/auth"
import { MEDIA_CACHE_CONTROL, parseMediaKey } from "../../lib/media"
import { getUserStatus } from "../../lib/profile"

export const prerender = false

/**
 * Serves a stored photo, but only to signed-in, approved alumni, and only for a
 * key we could have written. Everything else is a flat 404 rather than a 403, so
 * the response never confirms that a photo exists to anyone who may not see it.
 *
 * Responses are cached by the browser alone (`private`), never by a shared cache.
 */
export const GET: APIRoute = async ({ request, params }) => {
  const user = await getSessionUser(request)

  if (!user || !isApproved(user)) {
    return new Response("Not found", { status: 404 })
  }

  const key = params.key ?? ""
  const parsed = parseMediaKey(key)

  if (!parsed) return new Response("Not found", { status: 404 })

  try {
    // A suspended member's photos stop being served with the account.
    const ownerStatus = await getUserStatus(parsed.userId)

    if (ownerStatus !== "approved") return new Response("Not found", { status: 404 })

    const object = await env.MEDIA.get(key)

    if (!object) return new Response("Not found", { status: 404 })

    const headers = new Headers()

    object.writeHttpMetadata(headers)
    headers.set("Cache-Control", MEDIA_CACHE_CONTROL)
    headers.set("ETag", object.httpEtag)

    return new Response(object.body, { status: 200, headers })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}
