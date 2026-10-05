import type { Note, NoteKind } from "../data/mock"

export interface WallNote extends Omit<Note, "id"> {
  id: string
  zIndex: number
}

export interface WallResponse {
  pins: WallNote[]

  resetsAt: string
}

const noteKinds: NoteKind[] = ["sticky", "torn", "notebook", "polaroid", "card"]

const noteColors = ["yellow", "pink", "blue", "green", "mustard"]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isWallNote(value: unknown): value is WallNote {
  if (!isRecord(value)) return false

  return (
    typeof value.id === "string" &&
    typeof value.zIndex === "number" &&
    Number.isFinite(value.zIndex) &&
    typeof value.kind === "string" &&
    noteKinds.includes(value.kind as NoteKind) &&
    typeof value.text === "string" &&
    typeof value.author === "string" &&
    typeof value.x === "number" &&
    Number.isFinite(value.x) &&
    typeof value.y === "number" &&
    Number.isFinite(value.y) &&
    typeof value.rotation === "number" &&
    Number.isFinite(value.rotation) &&
    (value.color === undefined ||
      (typeof value.color === "string" && noteColors.includes(value.color))) &&
    (value.image === undefined || typeof value.image === "string") &&
    (value.doodle === undefined || typeof value.doodle === "string") &&
    (value.drawing === undefined ||
      (Array.isArray(value.drawing) &&
        value.drawing.every((path) => typeof path === "string"))) &&
    (value.ink === undefined || typeof value.ink === "string") &&
    (value.font === undefined ||
      value.font === "hand" ||
      value.font === "serif")
  )
}

function parseWallResponse(value: unknown): WallResponse {
  if (
    !isRecord(value) ||
    !Array.isArray(value.pins) ||
    !value.pins.every(isWallNote) ||
    typeof value.resetsAt !== "string" ||
    !Number.isFinite(Date.parse(value.resetsAt))
  ) {
    throw new Error("The wall service returned an invalid response.")
  }

  return {
    pins: value.pins,

    resetsAt: value.resetsAt,
  }
}

export async function fetchWall(
  date?: string,

  signal?: AbortSignal,
): Promise<WallResponse> {
  const url = new URL("/api/wall", window.location.origin)

  if (date) url.searchParams.set("date", date)

  const response = await fetch(url, {
    headers: { Accept: "application/json" },

    signal,
  })

  const payload: unknown = await response.json()

  if (!response.ok) {
    const message =
      isRecord(payload) &&
      isRecord(payload.error) &&
      typeof payload.error.message === "string"
        ? payload.error.message
        : "The wall could not be loaded right now."

    throw new Error(message)
  }

  return parseWallResponse(payload)
}

export function formatWallCountdown(resetsAt: string): string {
  const remaining = Date.parse(resetsAt) - Date.now()

  if (!Number.isFinite(remaining)) {
    throw new Error("The wall reset time is invalid.")
  }

  if (remaining <= 0) return "0m"

  const totalMinutes = Math.ceil(remaining / 60_000)

  const hours = Math.floor(totalMinutes / 60)

  const minutes = totalMinutes % 60

  return `${hours}h ${minutes}m`
}
