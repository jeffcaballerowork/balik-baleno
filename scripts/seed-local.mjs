import { randomUUID } from "node:crypto"

import { mkdirSync, unlinkSync, writeFileSync } from "node:fs"

import { spawnSync } from "node:child_process"

import { dirname, resolve } from "node:path"

import { fileURLToPath } from "node:url"

import { homePreviewNotes, initialNotes } from "../src/data/mock.ts"

import { WALL_CONFIG } from "../src/config.ts"

import { getManilaDate } from "../src/lib/wall-date.ts"

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")

const today = getManilaDate()

const wallDates = Array.from({ length: 5 }, (_, index) =>
  shiftDate(today, -index),
)

const sqlPath = resolve(
  projectRoot,
  ".wrangler",
  `seed-local-${randomUUID()}.sql`,
)

const wranglerCli = resolve(
  projectRoot,
  "node_modules",
  "wrangler",
  "bin",
  "wrangler.js",
)

const statements = []

const reactionKinds = [
  ["love", 24],

  ["relate", 12],

  ["nostalgia", 8],
]

const previewOrder = new Map(
  homePreviewNotes.map((note, index) => [note.id, index + 1]),
)

const seedDateList = wallDates.map(sqlValue).join(", ")

statements.push(
  `DELETE FROM reactions
   WHERE pin_id IN (
     SELECT id FROM pins
     WHERE owner_hash = 'local-seed' AND wall_date IN (${seedDateList})
   );`,
  `DELETE FROM pins
   WHERE owner_hash = 'local-seed' AND wall_date IN (${seedDateList});`,
)

function shiftDate(date, offset) {
  const value = new Date(`${date}T00:00:00.000Z`)

  value.setUTCDate(value.getUTCDate() + offset)

  return value.toISOString().slice(0, 10)
}

function sqlValue(value) {
  if (value === null || value === undefined) return "NULL"

  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new Error("Seed data contains a non-finite number.")

    return String(value)
  }

  return `'${String(value).replaceAll("'", "''")}'`
}

for (const wallDate of wallDates) {
  const wallNotes =
    wallDate === today
      ? initialNotes
      : initialNotes
          .filter(
            (_, index) =>
              (index + Number(wallDate.slice(-2))) % 3 !== 0,
          )
          .slice(0, 13)

  wallNotes.forEach((note, index) => {
    const pinId = `seed-${wallDate}-${note.id}`

    const createdAt = new Date(
      Date.parse(`${wallDate}T04:00:00.000Z`) + index * 1000,
    ).toISOString()
    const zIndex =
      previewOrder.get(note.id) ?? homePreviewNotes.length + index + 1

    const color = ["yellow", "pink", "blue", "green", "mustard"].includes(
      note.color ?? "",
    )
      ? note.color
      : null
    const ink =
      note.ink ??
      (note.kind === "card"
        ? note.color === "mustard"
          ? "#fff8e9"
          : "#fff2d9"
        : "#1b1a5f")

    // Sample image URLs are stored only in local seed rows to preserve the existing preview.

    statements.push(
      `INSERT INTO pins (
        id, wall_date, kind, color, body, author_name, font, ink, doodle,
        drawing_json, image_key, thumb_key, x_pct, y_pct, rotation, z_index,
        owner_hash, status, created_at, moved_at
      ) VALUES (
        ${sqlValue(pinId)}, ${sqlValue(wallDate)}, ${sqlValue(note.kind)},
        ${sqlValue(color)}, ${sqlValue(note.text)}, ${sqlValue(note.author)},
        ${sqlValue(note.font ?? "hand")}, ${sqlValue(ink)},
        ${sqlValue(note.doodle ?? null)}, ${sqlValue(note.drawing?.length ? JSON.stringify(note.drawing) : null)},
        ${sqlValue(note.image ?? null)}, NULL,
        ${sqlValue((note.x / WALL_CONFIG.logicalCanvasWidth) * 100)},
        ${sqlValue((note.y / WALL_CONFIG.logicalCanvasHeight) * 100)},
        ${sqlValue(note.rotation)}, ${zIndex}, 'local-seed', 'active',
        ${sqlValue(createdAt)}, NULL
      )
      ON CONFLICT(id) DO UPDATE SET
        created_at = excluded.created_at,
        z_index = excluded.z_index,
        ink = excluded.ink;`,
    )

    for (const [kind, count] of reactionKinds) {
      for (let voter = 1; voter <= count; voter++) {
        statements.push(
          `INSERT OR IGNORE INTO reactions (pin_id, kind, voter_hash)
           VALUES (${sqlValue(pinId)}, ${sqlValue(kind)}, ${sqlValue(`seed-${wallDate}-${note.id}-${kind}-${voter}`)});`,
        )
      }
    }
  })
}

mkdirSync(dirname(sqlPath), { recursive: true })

writeFileSync(
  sqlPath,

  `-- LOCAL DEVELOPMENT ONLY. Never apply this file to a remote D1 database.\n${statements.join("\n")}\n`,

  { flag: "wx" },
)

try {
  const result = spawnSync(
    process.execPath,

    [wranglerCli, "d1", "execute", "DB", "--local", "--file", sqlPath],

    {
      cwd: projectRoot,

      encoding: "utf8",

      stdio: "inherit",
    },
  )

  if (result.error) throw result.error

  if (result.status !== 0) {
    throw new Error(
      `Local D1 seed exited with status ${result.status ?? "unknown"}.`,
    )
  }

  console.log(
    `Seeded ${initialNotes.length} local pins for ${wallDates.join(", ")}.`,
  )
} finally {
  unlinkSync(sqlPath)
}
