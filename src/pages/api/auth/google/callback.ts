import type { APIRoute } from "astro"

import { AUTH_CONFIG } from "../../../../config"
import { errorResponse, logApiError } from "../../../../lib/api-response"
import {
  consumeOAuthState,
  createSession,
  exchangeGoogleCode,
  findOrCreateGoogleUser,
  getCookieOptions,
  hasAuthSecrets,
  verifyGoogleIdToken,
} from "../../../../lib/auth"

export const prerender = false

export const GET: APIRoute = async ({ cookies, request, url }) => {
  if (!hasAuthSecrets()) {
    return errorResponse(503, "auth_unavailable", "Sign-in is not configured yet.")
  }

  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")

  if (!code || !state) {
    return errorResponse(400, "invalid_oauth_callback", "Google did not return a valid sign-in response.")
  }

  try {
    const oauthState = await consumeOAuthState(request, state)

    if (!oauthState) {
      return errorResponse(400, "invalid_oauth_state", "Your sign-in request expired. Please try again.")
    }

    const redirectUri = new URL("/api/auth/google/callback", url.origin).toString()
    const tokens = await exchangeGoogleCode(code, redirectUri, oauthState.verifier)
    const identity = await verifyGoogleIdToken(tokens.id_token, oauthState.nonce)
    const user = await findOrCreateGoogleUser(identity)
    const session = await createSession(user.id)

    cookies.set(
      AUTH_CONFIG.sessionCookieName,
      session.cookieValue,
      getCookieOptions(request, Math.floor(AUTH_CONFIG.sessionLifetimeMs / 1000)),
    )
    cookies.delete(AUTH_CONFIG.oauthStateCookieName, getCookieOptions(request, 0))

    return Response.redirect(new URL(oauthState.returnTo, url.origin), 302)
  } catch (error) {
    logApiError("GET /api/auth/google/callback", error)

    return errorResponse(500, "oauth_sign_in_failed", "Google sign-in could not be completed.")
  }
}
