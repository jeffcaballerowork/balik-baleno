/**
 * Client-side auth helpers shared by the header script and the UserMenu island.
 */

/**
 * Sign the current user out. Fetches a CSRF token, posts it to the sign-out
 * endpoint, and reports whether the request succeeded. Never throws.
 */
export async function signOut(): Promise<boolean> {
  try {
    const csrfResponse = await fetch("/api/auth/csrf", { credentials: "same-origin" })
    const csrfBody = (await csrfResponse.json()) as { token?: string }
    if (!csrfBody.token) return false

    const response = await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "X-CSRF-Token": csrfBody.token },
      credentials: "same-origin",
    })

    return response.ok
  } catch {
    return false
  }
}
