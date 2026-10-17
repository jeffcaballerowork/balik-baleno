import test from "node:test"
import assert from "node:assert/strict"

import { blankProfileInput, galleryPhotoUpdateSchema, profileInputSchema } from "../src/lib/profile-input.ts"

test("a profile with only the sign-in name filled in is valid", () => {
  const parsed = profileInputSchema.safeParse(blankProfileInput)

  assert.equal(parsed.success, true)
})

test("a display name of only whitespace is refused", () => {
  const parsed = profileInputSchema.safeParse({ ...blankProfileInput, displayName: "   " })

  assert.equal(parsed.success, false)
})

test("a batch year outside the school's range is refused", () => {
  assert.equal(profileInputSchema.safeParse({ ...blankProfileInput, batchYear: 1990 }).success, false)
  assert.equal(profileInputSchema.safeParse({ ...blankProfileInput, batchYear: 2099 }).success, false)
})

test("an unknown marital status is refused", () => {
  const parsed = profileInputSchema.safeParse({ ...blankProfileInput, maritalStatus: "it's complicated" })

  assert.equal(parsed.success, false)
})

test("a bio longer than the limit is refused", () => {
  const parsed = profileInputSchema.safeParse({ ...blankProfileInput, bio: "a".repeat(401) })

  assert.equal(parsed.success, false)
})

test("text is trimmed, so blank becomes null at the boundary", () => {
  const parsed = profileInputSchema.safeParse({
    ...blankProfileInput,
    basedIn: "  Iloilo City  ",
    bio: "  ",
  })

  assert.equal(parsed.success, true)

  if (parsed.success) {
    assert.equal(parsed.data.basedIn, "Iloilo City")
    assert.equal(parsed.data.bio, null)
  }
})

test("a gallery caption is trimmed, and blank becomes null", () => {
  const parsed = galleryPhotoUpdateSchema.safeParse({ caption: "  Grade 6, 2004  " })

  assert.equal(parsed.success, true)

  if (parsed.success) assert.equal(parsed.data.caption, "Grade 6, 2004")

  const blank = galleryPhotoUpdateSchema.safeParse({ caption: "   " })

  assert.equal(blank.success, true)

  if (blank.success) assert.equal(blank.data.caption, null)
})

test("a caption longer than the limit is refused", () => {
  assert.equal(galleryPhotoUpdateSchema.safeParse({ caption: "a".repeat(81) }).success, false)
})

test("a gallery update may change the caption without moving the photo", () => {
  const parsed = galleryPhotoUpdateSchema.safeParse({ caption: "New" })

  assert.equal(parsed.success, true)

  if (parsed.success) assert.equal(parsed.data.position, undefined)
})

test("a negative or fractional gallery position is refused", () => {
  assert.equal(galleryPhotoUpdateSchema.safeParse({ position: -1 }).success, false)
  assert.equal(galleryPhotoUpdateSchema.safeParse({ position: 1.5 }).success, false)
})
