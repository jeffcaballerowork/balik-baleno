export async function hashOwnerToken(
  token: string,

  salt: string,
): Promise<string> {
  const input = new TextEncoder().encode(`${salt}:${token}`)

  const digest = await crypto.subtle.digest("SHA-256", input)

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")
}
