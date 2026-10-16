import test from "node:test"
import assert from "node:assert/strict"

import {
  TEACHER_PAGE_SIZE,
  filterTeachers,
  listSubjects,
  paginate,
} from "../src/lib/teacher-filter.ts"

const teachers = [
  { name: "Ms. Corazon Aquino", subject: "Mathematics" },
  { name: "Mr. Juan Dela Cruz", subject: "Physics" },
  { name: "Mrs. Maria Santos", subject: "English" },
  { name: "Mr. Pedro Reyes", subject: "Mathematics" },
  { name: "Ms. Liza Mercado", subject: null },
]

test("listSubjects returns unique subjects sorted alphabetically", () => {
  assert.deepEqual(listSubjects(teachers), ["English", "Mathematics", "Physics"])
})

test("listSubjects ignores null and blank subjects", () => {
  assert.deepEqual(
    listSubjects([
      { name: "A", subject: null },
      { name: "B", subject: "  " },
    ]),
    [],
  )
})

test("filterTeachers returns everyone for an empty query and subject", () => {
  assert.equal(filterTeachers(teachers, "", "").length, 5)
})

test("filterTeachers matches a partial name case-insensitively", () => {
  assert.deepEqual(
    filterTeachers(teachers, "corazon", "").map(teacher => teacher.name),
    ["Ms. Corazon Aquino"],
  )
})

test("filterTeachers matches the subject text", () => {
  assert.deepEqual(
    filterTeachers(teachers, "math", "").map(teacher => teacher.name),
    ["Ms. Corazon Aquino", "Mr. Pedro Reyes"],
  )
})

test("filterTeachers narrows to an exact subject", () => {
  assert.deepEqual(
    filterTeachers(teachers, "", "Mathematics").map(teacher => teacher.name),
    ["Ms. Corazon Aquino", "Mr. Pedro Reyes"],
  )
})

test("filterTeachers combines query and subject", () => {
  assert.deepEqual(
    filterTeachers(teachers, "pedro", "Mathematics").map(teacher => teacher.name),
    ["Mr. Pedro Reyes"],
  )
})

test("filterTeachers trims the query", () => {
  assert.equal(filterTeachers(teachers, "  juan  ", "").length, 1)
})

test("paginate splits items into pages", () => {
  const items = Array.from({ length: 7 }, (_, index) => index + 1)
  const first = paginate(items, 1, 6)
  assert.equal(first.pageCount, 2)
  assert.equal(first.page, 1)
  assert.deepEqual(first.items, [1, 2, 3, 4, 5, 6])
})

test("paginate returns the last partial page", () => {
  const items = Array.from({ length: 7 }, (_, index) => index + 1)
  const second = paginate(items, 2, 6)
  assert.equal(second.page, 2)
  assert.deepEqual(second.items, [7])
})

test("paginate clamps a page number beyond the range", () => {
  const items = Array.from({ length: 7 }, (_, index) => index + 1)
  const result = paginate(items, 99, 6)
  assert.equal(result.page, 2)
  assert.deepEqual(result.items, [7])
})

test("paginate handles an empty list as a single empty page", () => {
  const result = paginate([], 1, 6)
  assert.equal(result.pageCount, 1)
  assert.equal(result.page, 1)
  assert.deepEqual(result.items, [])
})

test("TEACHER_PAGE_SIZE is a positive integer", () => {
  assert.equal(Number.isInteger(TEACHER_PAGE_SIZE), true)
  assert.ok(TEACHER_PAGE_SIZE > 0)
})
