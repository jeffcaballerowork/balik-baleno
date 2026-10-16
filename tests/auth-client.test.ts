import test from "node:test"
import assert from "node:assert/strict"

import { signOut } from "../src/lib/auth-client.ts"

interface Call {
  url: string
  init: RequestInit | undefined
}

function stubFetch(
  handler: (url: string, init: RequestInit | undefined) => Response | Promise<Response>,
): { calls: Call[]; restore: () => void } {
  const calls: Call[] = []
  const original = globalThis.fetch

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
    calls.push({ url, init })
    return handler(url, init)
  }) as typeof fetch

  return { calls, restore: () => (globalThis.fetch = original) }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

test("signOut fetches a CSRF token then posts it to /api/auth/signout", async () => {
  const { calls, restore } = stubFetch(url =>
    url.endsWith("/api/auth/csrf") ? json({ token: "abc123" }) : json({ ok: true }),
  )

  try {
    assert.equal(await signOut(), true)
  } finally {
    restore()
  }

  assert.equal(calls.length, 2)
  assert.ok(calls[0].url.endsWith("/api/auth/csrf"))
  assert.equal(calls[0].init?.credentials, "same-origin")

  const post = calls[1]
  assert.ok(post.url.endsWith("/api/auth/signout"))
  assert.equal(post.init?.method, "POST")
  assert.equal(post.init?.credentials, "same-origin")
  assert.equal((post.init?.headers as Record<string, string>)["X-CSRF-Token"], "abc123")
})

test("signOut does not post when the CSRF response has no token", async () => {
  const { calls, restore } = stubFetch(() => json({}))

  try {
    assert.equal(await signOut(), false)
  } finally {
    restore()
  }

  assert.equal(calls.length, 1)
})

test("signOut returns false when the signout request fails", async () => {
  const { calls, restore } = stubFetch(url =>
    url.endsWith("/api/auth/csrf") ? json({ token: "abc123" }) : json({ error: "nope" }, 500),
  )

  try {
    assert.equal(await signOut(), false)
  } finally {
    restore()
  }

  assert.equal(calls.length, 2)
})

test("signOut returns false when fetch throws", async () => {
  const original = globalThis.fetch
  globalThis.fetch = (async () => {
    throw new Error("offline")
  }) as typeof fetch

  try {
    assert.equal(await signOut(), false)
  } finally {
    globalThis.fetch = original
  }
})
