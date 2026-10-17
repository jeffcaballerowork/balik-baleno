import test from "node:test"
import assert from "node:assert/strict"

import { summariseBatch } from "../src/lib/batch.ts"

test("a member who hid is in neither count", () => {
  const summary = summariseBatch({
    members: [{ listed_in_batch: 1 }, { listed_in_batch: 0 }, { listed_in_batch: 1 }],
    notes: [{ hidden: 0 }, { hidden: 0 }, { hidden: 0 }],
  })

  assert.equal(summary.members, 2)
})

test("a hidden note is in neither count", () => {
  const summary = summariseBatch({
    members: [{ listed_in_batch: 1 }, { listed_in_batch: 1 }],
    notes: [{ hidden: 0 }, { hidden: 1 }, { hidden: 1 }],
  })

  assert.equal(summary.notes, 1)
})

test("hiding a member does not hide the notes they already pinned", () => {
  const summary = summariseBatch({
    members: [{ listed_in_batch: 0 }],
    notes: [{ hidden: 0 }],
  })

  assert.equal(summary.members, 0)
  assert.equal(summary.notes, 1)
})

test("an empty batch returns zeros rather than a plausible number", () => {
  const summary = summariseBatch({ members: [], notes: [] })

  assert.deepEqual(summary, { members: 0, notes: 0 })
})
