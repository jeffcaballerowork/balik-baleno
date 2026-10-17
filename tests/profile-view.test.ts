import test from "node:test"
import assert from "node:assert/strict"

import { toEditableProfile, toProfileView, type ProfileRow } from "../src/lib/profile-view.ts"

function row(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    display_name: "Juan Dela Cruz",
    batch_year: 2011,
    bio: "Still climbing.",
    profession: "Teacher",
    based_in: "Iloilo City",
    birth_month: 10,
    birth_day: 17,
    birth_year: 1993,
    birthday_visible: 1,
    birth_year_visible: 1,
    marital_status: "married",
    marital_visible: 1,
    social_facebook: "juan",
    social_instagram: null,
    social_tiktok: null,
    avatar_key: "u/1/avatar-a.jpg",
    avatar_then_key: "u/1/then-a.jpg",
    avatar_then_visible: 1,
    cover_key: "u/1/cover-a.jpg",
    open_to_meetups: 1,
    listed_in_batch: 1,
    ...overrides,
  }
}

test("birth year hides on its own while the day and month stay visible", () => {
  const view = toProfileView(row({ birth_year_visible: 0 }))

  assert.equal(view.birthYear, null)
  assert.equal(view.birthMonth, 10)
  assert.equal(view.birthDay, 17)
})

test("the day and month stay hidden until the birthday switch is on", () => {
  const view = toProfileView(row({ birthday_visible: 0 }))

  assert.equal(view.birthMonth, null)
  assert.equal(view.birthDay, null)
})

test("marital status hides until its own switch is on", () => {
  assert.equal(toProfileView(row({ marital_visible: 0 })).maritalStatus, null)
  assert.equal(toProfileView(row()).maritalStatus, "married")
})

test("a blank based_in is nothing at all", () => {
  assert.equal(toProfileView(row({ based_in: "   " })).basedIn, null)
  assert.equal(toProfileView(row({ based_in: "" })).basedIn, null)
  assert.equal(toProfileView(row({ based_in: null })).basedIn, null)
})

test("a blank bio and profession are nothing at all", () => {
  const view = toProfileView(row({ bio: "  ", profession: "" }))

  assert.equal(view.bio, null)
  assert.equal(view.profession, null)
})

test("the batch-era photo hides until its own switch is on", () => {
  assert.equal(toProfileView(row({ avatar_then_visible: 0 })).avatarThenKey, null)
  assert.equal(toProfileView(row()).avatarThenKey, "u/1/then-a.jpg")
})

test("open to meetups defaults to off", () => {
  assert.equal(toProfileView(row({ open_to_meetups: 0 })).openToMeetups, false)
  assert.equal(toProfileView(row()).openToMeetups, true)
})

test("blank social handles are null rather than empty strings", () => {
  const view = toProfileView(row({ social_facebook: "  ", social_instagram: "", social_tiktok: null }))

  assert.deepEqual(view.socials, { facebook: null, instagram: null, tiktok: null })
})

test("a full row keeps everything the switches allow", () => {
  const view = toProfileView(row())

  assert.equal(view.displayName, "Juan Dela Cruz")
  assert.equal(view.batchYear, 2011)
  assert.equal(view.bio, "Still climbing.")
  assert.equal(view.profession, "Teacher")
  assert.equal(view.basedIn, "Iloilo City")
  assert.equal(view.birthYear, 1993)
  assert.equal(view.avatarKey, "u/1/avatar-a.jpg")
  assert.equal(view.avatarThenKey, "u/1/then-a.jpg")
  assert.equal(view.coverKey, "u/1/cover-a.jpg")
  assert.equal(view.listedInBatch, true)
  assert.deepEqual(view.socials, { facebook: "juan", instagram: null, tiktok: null })
})

test("the editor sees the values the public view hides", () => {
  const editable = toEditableProfile(
    row({ birth_year_visible: 0, marital_visible: 0, avatar_then_visible: 0 }),
  )

  assert.equal(editable.birthYear, 1993)
  assert.equal(editable.maritalStatus, "married")
  assert.equal(editable.birthdayVisible, true)
  assert.equal(editable.birthYearVisible, false)
  assert.equal(editable.avatarThenVisible, false)
})

test("the editor reads switches as booleans rather than 1 and 0", () => {
  const editable = toEditableProfile(
    row({ open_to_meetups: 0, listed_in_batch: 0, avatar_then_visible: 0 }),
  )

  assert.equal(editable.openToMeetups, false)
  assert.equal(editable.listedInBatch, false)
})
