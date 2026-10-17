import test from "node:test"
import assert from "node:assert/strict"

import {
  buildMediaKey,
  mediaUrl,
  parseMediaKey,
  savePhoto,
  sniffImageType,
  type MediaBucket,
} from "../src/lib/media.ts"

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50,
])
const TEXT = new TextEncoder().encode("this is not an image at all")
const USER_ID = "8f1c2f6e-0b7a-4c1d-9a2e-3b4c5d6e7f80"

test("sniffImageType accepts a JPEG, a PNG and a WebP", () => {
  assert.equal(sniffImageType(JPEG), "image/jpeg")
  assert.equal(sniffImageType(PNG), "image/png")
  assert.equal(sniffImageType(WEBP), "image/webp")
})

test("sniffImageType refuses a text file that pretends to be an image", () => {
  assert.equal(sniffImageType(TEXT), null)
})

test("sniffImageType refuses an empty payload", () => {
  assert.equal(sniffImageType(new Uint8Array([])), null)
})

test("sniffImageType refuses a RIFF file that is not a WebP", () => {
  const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45])

  assert.equal(sniffImageType(wav), null)
})

test("buildMediaKey keeps a hostile user id inside one path segment", () => {
  const key = buildMediaKey("../../etc/passwd", "avatar", "image/jpeg")

  assert.ok(key.startsWith("u/"), `expected a u/ prefix, got ${key}`)
  assert.ok(!key.includes(".."), `expected no traversal in ${key}`)
  assert.equal(key.split("/").length, 3, `expected three segments in ${key}`)
})

test("buildMediaKey never starts a path segment with a dot", () => {
  const key = buildMediaKey(".hidden", "cover", "image/png")

  for (const segment of key.split("/")) {
    assert.ok(!segment.startsWith("."), `expected no dotted segment in ${key}`)
  }
})

test("buildMediaKey ends with the extension for the sniffed type", () => {
  assert.ok(buildMediaKey(USER_ID, "cover", "image/jpeg").endsWith(".jpg"))
  assert.ok(buildMediaKey(USER_ID, "cover", "image/png").endsWith(".png"))
  assert.ok(buildMediaKey(USER_ID, "cover", "image/webp").endsWith(".webp"))
})

test("buildMediaKey does not reuse a key for a repeated upload", () => {
  const keys = new Set([
    buildMediaKey(USER_ID, "gallery", "image/jpeg"),
    buildMediaKey(USER_ID, "gallery", "image/jpeg"),
    buildMediaKey(USER_ID, "gallery", "image/jpeg"),
  ])

  assert.equal(keys.size, 3)
})

test("parseMediaKey reads back the owner of a key we built", () => {
  const key = buildMediaKey(USER_ID, "gallery", "image/webp")
  const parsed = parseMediaKey(key)

  assert.deepEqual(parsed, { userId: USER_ID, kind: "gallery" })
})

test("parseMediaKey refuses traversal, foreign keys and unknown kinds", () => {
  assert.equal(parseMediaKey("u/../../secrets/avatar-12345678.jpg"), null)
  assert.equal(parseMediaKey("something-else.md"), null)
  assert.equal(parseMediaKey(`u/${USER_ID}/secrets-12345678.jpg`), null)
  assert.equal(parseMediaKey(`u/${USER_ID}/avatar-12345678.gif`), null)
  assert.equal(parseMediaKey(`u/${USER_ID}/avatar-1234.jpg`), null)
})

test("mediaUrl returns a servable path and nothing for a missing photo", () => {
  assert.equal(mediaUrl(null), null)

  assert.equal(mediaUrl("  "), null)
  assert.equal(mediaUrl(`u/${USER_ID}/avatar-12345678.jpg`), `/media/u/${USER_ID}/avatar-12345678.jpg`)
})

test("savePhoto refuses a payload that is not an image without touching the bucket", async () => {
  const writes: string[] = []
  const bucket = {
    put: async (key: string) => {
      writes.push(key)
    },
  } as unknown as MediaBucket

  await assert.rejects(() => savePhoto(bucket, USER_ID, "avatar", TEXT))

  assert.deepEqual(writes, [])
})

test("savePhoto stores the image under the member's own prefix", async () => {
  const writes: string[] = []
  const bucket = {
    put: async (key: string) => {
      writes.push(key)
    },
  } as unknown as MediaBucket
  const key = await savePhoto(bucket, USER_ID, "cover", JPEG)

  assert.equal(writes.length, 1)
  assert.equal(writes[0], key)
  assert.ok(key.startsWith(`u/${USER_ID}/cover-`))
  assert.ok(key.endsWith(".jpg"))
})

test("savePhoto records the sniffed type rather than trusting the client", async () => {
  const metadata: Array<{ contentType?: string } | undefined> = []
  const bucket = {
    put: async (_key: string, _value: unknown, options?: { httpMetadata?: { contentType?: string } }) => {
      metadata.push(options?.httpMetadata)
    },
  } as unknown as MediaBucket

  await savePhoto(bucket, USER_ID, "avatar", PNG)

  assert.equal(metadata[0]?.contentType, "image/png")
})
