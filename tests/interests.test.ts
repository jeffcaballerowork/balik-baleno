import test from "node:test"
import assert from "node:assert/strict"

import { matchInterests, slugify, togglePick, type InterestOption } from "../src/lib/interests.ts"

const CATALOGUE: InterestOption[] = [
  { slug: "coffee", label: "Coffee", group: "Around the table", sort: 10 },
  { slug: "milk-tea", label: "Milk tea", group: "Around the table", sort: 20 },
  { slug: "kansi-batchoy", label: "Kansi & batchoy", group: "Around the table", sort: 30 },
  { slug: "opm", label: "OPM", group: "Music & screen", sort: 10 },
  { slug: "basketball", label: "Basketball", group: "Sports & fitness", sort: 10 },
]

test("slugify turns a hand-typed interest into a stable slug", () => {
  assert.equal(slugify("Kansi & Batchoy"), "kansi-batchoy")
  assert.equal(slugify("K-Pop"), "k-pop")
  assert.equal(slugify("  Drum & bugle  "), "drum-bugle")
})

test("slugify folds accents rather than dropping the letter", () => {
  assert.equal(slugify("Café"), "cafe")
  assert.equal(slugify("Sari-sari store"), "sari-sari-store")
})

test("slugify returns null when nothing usable is left", () => {
  assert.equal(slugify("!!!"), null)
  assert.equal(slugify("   "), null)
  assert.equal(slugify(""), null)
})

test("matchInterests is case-insensitive across labels and slugs", () => {
  assert.deepEqual(
    matchInterests(CATALOGUE, "BATCHOY").map(interest => interest.slug),
    ["kansi-batchoy"],
  )
  assert.deepEqual(
    matchInterests(CATALOGUE, "milk").map(interest => interest.slug),
    ["milk-tea"],
  )
})

test("matchInterests keeps each interest's group so the shelf can group results", () => {
  const found = matchInterests(CATALOGUE, "opm")

  assert.equal(found.length, 1)
  assert.equal(found[0]?.group, "Music & screen")
})

test("matchInterests returns nothing for a blank query and nothing for a miss", () => {
  assert.deepEqual(matchInterests(CATALOGUE, "   "), [])
  assert.deepEqual(matchInterests(CATALOGUE, "swimming"), [])
})

test("togglePick adds a pick, and a second toggle takes it back off", () => {
  const picked = togglePick([], "coffee", 10)

  assert.deepEqual(picked, ["coffee"])
  assert.deepEqual(togglePick(picked, "coffee", 10), [])
})

test("togglePick refuses an eleventh pick rather than dropping an earlier one", () => {
  const ten = ["coffee", "milk-tea", "kansi-batchoy", "opm", "basketball", "a", "b", "c", "d", "e"]
  const eleven = togglePick(ten, "swimming", 10)

  assert.deepEqual(eleven, ten)
})

test("togglePick never duplicates a pick", () => {
  const picked = togglePick(["coffee"], "coffee", 10)

  assert.deepEqual(picked, [])
  assert.deepEqual(togglePick(["coffee", "opm"], "opm", 10), ["coffee"])
})
