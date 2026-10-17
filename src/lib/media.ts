/**
 * Photo storage: naming, sniffing, and the two R2 calls.
 *
 * The bucket arrives as a parameter rather than being imported from
 * `cloudflare:workers`, so this module has no runtime dependency on the Workers
 * runtime and its rules can be unit tested. The type below is structural on
 * purpose: the real `env.MEDIA` binding satisfies it without this file needing
 * the Workers typings.
 */

export type ImageType = "image/jpeg" | "image/png" | "image/webp"

export const MEDIA_KINDS = ["cover", "avatar", "avatar_then", "gallery"] as const

export type MediaKind = (typeof MEDIA_KINDS)[number]

export const MEDIA_URL_PREFIX = "/media/"

/**
 * Browser cache only. A profile photo is served to signed-in, approved alumni,
 * and a shared cache must never hand it to anyone else.
 */
export const MEDIA_CACHE_CONTROL = "private, max-age=86400"

export interface MediaBucket {
  put(
    key: string,
    value: Uint8Array,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
  ): Promise<unknown>

  delete(key: string): Promise<void>
}

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff]
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

const EXTENSIONS: Record<ImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"

const MEDIA_KEY_PATTERN = new RegExp(
  `^u/(${UUID})/(${MEDIA_KINDS.join("|")})-([a-z0-9]{8})\\.(jpg|png|webp)$`,
)

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte)
}

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length))
}

/** The content type comes from the bytes, never from the client's header. */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  if (startsWith(bytes, JPEG_SIGNATURE)) return "image/jpeg"

  if (startsWith(bytes, PNG_SIGNATURE)) return "image/png"

  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
    return "image/webp"
  }

  return null
}

/** One path segment: no dots, no slashes, whatever the input was. */
function safeSegment(value: string): string {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/gu, "")

  return cleaned === "" ? "unknown" : cleaned
}

export function buildMediaKey(userId: string, kind: MediaKind, type: ImageType): string {
  const random = crypto.randomUUID().replace(/-/gu, "").slice(0, 8)

  return `u/${safeSegment(userId)}/${safeSegment(kind)}-${random}.${EXTENSIONS[type]}`
}

export interface ParsedMediaKey {
  userId: string
  kind: MediaKind
}

/** Only keys this module builds are servable or deletable. */
export function parseMediaKey(key: string): ParsedMediaKey | null {
  const match = MEDIA_KEY_PATTERN.exec(key.trim())

  if (!match) return null

  return { userId: match[1] as string, kind: match[2] as MediaKind }
}

export function mediaUrl(key: string | null): string | null {
  const trimmed = key?.trim() ?? ""

  return trimmed === "" ? null : `${MEDIA_URL_PREFIX}${trimmed}`
}

export async function savePhoto(
  bucket: MediaBucket,
  userId: string,
  kind: MediaKind,
  bytes: Uint8Array,
): Promise<string> {
  const type = sniffImageType(bytes)

  if (!type) throw new Error("unsupported_image_type")

  const key = buildMediaKey(userId, kind, type)

  await bucket.put(key, bytes, {
    httpMetadata: { contentType: type, cacheControl: MEDIA_CACHE_CONTROL },
  })

  return key
}

export async function deletePhoto(bucket: MediaBucket, key: string | null): Promise<void> {
  const trimmed = key?.trim() ?? ""

  // Never delete a key this module would not have written.
  if (trimmed === "" || !parseMediaKey(trimmed)) return

  await bucket.delete(trimmed)
}
