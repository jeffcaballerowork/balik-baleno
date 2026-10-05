import type { Note, NoteKind } from "../data/mock"

const storageKey = "balik-baleno-mock-pins"
const incomingNoteKey = "balik-baleno-incoming-mock-pin"

const noteKinds: NoteKind[] = ["sticky", "torn", "notebook", "polaroid", "card"]

function isNote(value: unknown): value is Note {
  if (typeof value !== "object" || value === null) return false

  const note = value as Record<string, unknown>

  return (
    typeof note.id === "number" &&
    Number.isFinite(note.id) &&
    typeof note.kind === "string" &&
    noteKinds.includes(note.kind as NoteKind) &&
    typeof note.text === "string" &&
    typeof note.author === "string" &&
    typeof note.x === "number" &&
    typeof note.y === "number" &&
    typeof note.rotation === "number" &&
    (note.color === undefined || typeof note.color === "string") &&
    (note.image === undefined || typeof note.image === "string") &&
    (note.doodle === undefined || typeof note.doodle === "string") &&
    (note.drawing === undefined ||
      (Array.isArray(note.drawing) &&
        note.drawing.every((path) => typeof path === "string"))) &&
    (note.ink === undefined || typeof note.ink === "string") &&
    (note.font === undefined || note.font === "hand" || note.font === "serif")
  )
}

export function loadMockPins(): Note[] {
  const stored = window.sessionStorage.getItem(storageKey)

  if (stored === null) return []

  let parsed: unknown

  try {
    parsed = JSON.parse(stored)
  } catch (error) {
    console.error("Unable to read locally created mock notes.", error)

    return []
  }

  if (!Array.isArray(parsed) || !parsed.every(isNote)) {
    console.error("Locally created mock notes have an invalid format.")

    return []
  }

  return parsed
}

export function saveMockPin(note: Note) {
  window.sessionStorage.setItem(
    storageKey,

    JSON.stringify([...loadMockPins(), note]),
  )
  window.sessionStorage.setItem(incomingNoteKey, String(note.id))
}

export function consumeIncomingMockPinId(): number | null {
  const stored = window.sessionStorage.getItem(incomingNoteKey)

  if (stored === null) return null

  window.sessionStorage.removeItem(incomingNoteKey)

  const id = Number(stored)

  if (!Number.isSafeInteger(id)) {
    console.error("The locally created mock note ID is invalid.")

    return null
  }

  return id
}
