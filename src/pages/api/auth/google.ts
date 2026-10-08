import type { APIRoute } from "astro"

import { env } from "cloudflare:workers"

import { AUTH_CONFIG } from "../../../config"
import { errorResponse, logApiError } from "../../../lib/api-response"
import { createOAuthState, getCookieOptions, hasAuthSecrets, pkceChallenge } from "../../../lib/auth"

export const prerender = false

function safeReturnTo(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/join"
}

export const GET: APIRoute = async ({ cookies, request, url }) => {
  if (!hasAuthSecrets()) {
    return errorResponse(503, "auth_unavailable", "Sign-in is not configured yet.")
  }

  try {
    const returnTo = safeReturnTo(url.searchParams.get("returnTo"))
    const oauthState = await createOAuthState(returnTo)
    const redirectUri = new URL("/api/auth/google/callback", url.origin).toString()
    const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth")

    authorizationUrl.search = new URLSearchParams({
      client_id: env.GOOGLE_OAUTH_CLIENT_ID,
      code_challenge: await pkceChallenge(oauthState.verifier),
      code_challenge_method: "S256",
      nonce: oauthState.nonce,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state: oauthState.state,
    }).toString()

    cookies.set(
      AUTH_CONFIG.oauthStateCookieName,
      oauthState.cookieValue,
      getCookieOptions(request, Math.ceil(AUTH_CONFIG.oauthStateLifetimeMs / 1000)),
    )

    return Response.redirect(authorizationUrl, 302)
  } catch (error) {
    logApiError("GET /api/auth/google", error)

    return errorResponse(500, "oauth_unavailable", "Google sign-in could not be started.")
  }
}
