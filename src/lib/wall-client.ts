import type {
  Note,
  NoteKind,
  NoteReactionCounts,
  NoteReactionState,
  ReactionKind,
} from "../data/mock"

export interface WallNote
  extends Omit<Note, "id" | "reactionCounts" | "myReactions"> {
  id: string
  zIndex: number
  canMove: boolean
  canEdit: boolean
  canDelete: boolean
  edited: boolean
  hidden: boolean
  reactionCounts: NoteReactionCounts
  myReactions: NoteReactionState
}

export interface WallResponse {
  pins: WallNote[]

  resetsAt: string
}

export interface ArchiveDay {
  date: string
  count: number
}

export interface ArchiveDaysResponse {
  month: string
  days: ArchiveDay[]
}

export interface ArchiveDateResponse {
  date: string
  count: number
  pins: WallNote[]
}

interface ApiErrorDetails {
  code: string
  message: string
}

const noteKinds: NoteKind[] = ["sticky", "torn", "notebook", "polaroid", "card"]

const noteColors = ["yellow", "pink", "blue", "green", "mustard"] as const

const deviceTokenKey = "balik-baleno-device-token"

export type NoteColor = typeof noteColors[number]

export interface CreatePinInput {
  kind: NoteKind
  color: NoteColor | null
  body: string
  authorName: string | null
  font: "hand" | "serif"
  ink: string
  doodle: string | null
  drawing: string[]
  x: number
  y: number
  rotation: number
  hasPhoto: boolean
}

export interface CreatePinResponse {
  id: string
  wallDate: string
}

export interface PinPosition {
  x: number
  y: number
}

export interface MovePinResponse extends PinPosition {
  id: string
  movedAt: string
}

export interface ToggleReactionResponse {
  pinId: string
  reactionCounts: NoteReactionCounts
  myReactions: NoteReactionState
}

export interface ReportPinResponse {
  id: string
  pinId: string
  createdAt: string
}

const reactionKinds: ReactionKind[] = ["love", "relate", "nostalgia"]

export class WallApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message)
    this.name = "WallApiError"
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isReactionCounts(value: unknown): value is NoteReactionCounts {
  return (
    isRecord(value) &&
    reactionKinds.every(
      (kind) =>
        typeof value[kind] === "number" &&
        Number.isSafeInteger(value[kind]) &&
        value[kind] >= 0,
    )
  )
}

function isReactionState(value: unknown): value is NoteReactionState {
  return (
    isRecord(value) &&
    reactionKinds.every((kind) => typeof value[kind] === "boolean")
  )
}

function readApiError(value: unknown, fallback: string): ApiErrorDetails {
  if (
    isRecord(value) &&
    isRecord(value.error) &&
    typeof value.error.code === "string" &&
    typeof value.error.message === "string"
  ) {
    return { code: value.error.code, message: value.error.message }
  }

  return { code: "unknown_error", message: fallback }
}

export function getDeviceToken(): string {
  const existing = window.localStorage.getItem(deviceTokenKey)

  if (existing && /^[a-f0-9]{64}$/.test(existing)) return existing

  const bytes = window.crypto.getRandomValues(new Uint8Array(32))
  const token = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")

  window.localStorage.setItem(deviceTokenKey, token)

  return token
}

function isWallNote(value: unknown): value is WallNote {
  if (!isRecord(value)) return false

  return (
    typeof value.id === "string" &&
    typeof value.zIndex === "number" &&
    Number.isFinite(value.zIndex) &&
    typeof value.canMove === "boolean" &&
    typeof value.canEdit === "boolean" &&
    typeof value.canDelete === "boolean" &&
    typeof value.edited === "boolean" &&
    typeof value.hidden === "boolean" &&
    isReactionCounts(value.reactionCounts) &&
    isReactionState(value.myReactions) &&
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
      (typeof value.color === "string" &&
        noteColors.some((color) => color === value.color))) &&
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

function isArchiveDay(value: unknown, month: string): value is ArchiveDay {
  return (
    isRecord(value) &&
    typeof value.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
    value.date.startsWith(`${month}-`) &&
    typeof value.count === "number" &&
    Number.isSafeInteger(value.count) &&
    value.count > 0
  )
}

export async function fetchArchiveDays(
  month: string,
  signal?: AbortSignal,
): Promise<ArchiveDaysResponse> {
  const url = new URL("/api/archive/days", window.location.origin)
  url.searchParams.set("month", month)

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal,
  })
  const payload: unknown = await response.json()

  if (!response.ok) {
    const error = readApiError(
      payload,
      "Archive days could not be loaded right now.",
    )
    throw new WallApiError(error.message, response.status, error.code)
  }

  if (
    !isRecord(payload) ||
    payload.month !== month ||
    !Array.isArray(payload.days) ||
    !payload.days.every((day) => isArchiveDay(day, month))
  ) {
    throw new Error("The archive service returned invalid day counts.")
  }

  return { month, days: payload.days }
}

export async function fetchArchiveDate(
  date: string,
  signal?: AbortSignal,
): Promise<ArchiveDateResponse> {
  const response = await fetch(`/api/archive/${encodeURIComponent(date)}`, {
    headers: {
      Accept: "application/json",
      "X-Device-Token": getDeviceToken(),
    },
    signal,
  })
  const payload: unknown = await response.json()

  if (!response.ok) {
    const error = readApiError(
      payload,
      "Archive notes could not be loaded right now.",
    )
    throw new WallApiError(error.message, response.status, error.code)
  }

  if (
    !isRecord(payload) ||
    payload.date !== date ||
    typeof payload.count !== "number" ||
    !Number.isSafeInteger(payload.count) ||
    payload.count < 0 ||
    !Array.isArray(payload.pins) ||
    !payload.pins.every(isWallNote) ||
    payload.count !== payload.pins.length
  ) {
    throw new Error("The archive service returned invalid notes.")
  }

  return {
    date: payload.date,
    count: payload.count,
    pins: payload.pins,
  }
}

export async function fetchWall(
  date?: string,

  signal?: AbortSignal,

  deviceToken?: string,
): Promise<WallResponse> {
  const url = new URL("/api/wall", window.location.origin)

  if (date) url.searchParams.set("date", date)

  const headers = new Headers({ Accept: "application/json" })

  if (deviceToken) headers.set("X-Device-Token", deviceToken)

  const response = await fetch(url, {
    headers,

    signal,
  })

  const payload: unknown = await response.json()

  if (!response.ok) {
    const error = readApiError(
      payload,
      "The wall could not be loaded right now.",
    )

    throw new WallApiError(error.message, response.status, error.code)
  }

  return parseWallResponse(payload)
}

export interface EditPinResponse {
  id: string
  body: string
  editedAt: string
}

export interface DeletePinResponse {
  id: string
  wallDate: string
}

async function csrfToken(): Promise<string> {
  const response = await fetch("/api/auth/csrf", { credentials: "same-origin" })
  const payload: unknown = await response.json()

  if (!response.ok || !isRecord(payload) || typeof payload.token !== "string") {
    throw new Error("Could not prepare the request.")
  }

  return payload.token
}

export async function createPin(
  input: CreatePinInput,
): Promise<CreatePinResponse> {
  const token = await csrfToken()
  const response = await fetch("/api/pins", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-CSRF-Token": token,
    },
    body: JSON.stringify({ ...input, deviceToken: getDeviceToken() }),
  })

  const payload: unknown = await response.json()

  if (!response.ok) {
    const error = readApiError(
      payload,
      "Your note could not be added right now.",
    )

    throw new WallApiError(error.message, response.status, error.code)
  }

  if (
    !isRecord(payload) ||
    typeof payload.id !== "string" ||
    typeof payload.wallDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(payload.wallDate)
  ) {
    throw new Error("The wall service returned an invalid pin response.")
  }

  return { id: payload.id, wallDate: payload.wallDate }
}

export async function movePin(
  id: string,
  position: PinPosition,
): Promise<MovePinResponse> {
  const token = await csrfToken()
  const response = await fetch(`/api/pins/${encodeURIComponent(id)}/position`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-CSRF-Token": token,
    },
    body: JSON.stringify({ ...position, deviceToken: getDeviceToken() }),
  })

  const payload: unknown = await response.json()

  if (!response.ok) {
    const error = readApiError(payload, "The note position could not be saved.")

    throw new WallApiError(error.message, response.status, error.code)
  }

  if (
    !isRecord(payload) ||
    payload.id !== id ||
    typeof payload.x !== "number" ||
    !Number.isFinite(payload.x) ||
    typeof payload.y !== "number" ||
    !Number.isFinite(payload.y) ||
    typeof payload.movedAt !== "string" ||
    !Number.isFinite(Date.parse(payload.movedAt))
  ) {
    throw new Error("The wall service returned an invalid position response.")
  }

  return {
    id: payload.id,
    x: payload.x,
    y: payload.y,
    movedAt: payload.movedAt,
  }
}

export async function editPin(id: string, body: string): Promise<EditPinResponse> {
  const token = await csrfToken()
  const response = await fetch(`/api/pins/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-CSRF-Token": token,
    },
    body: JSON.stringify({ body }),
  })

  const payload: unknown = await response.json()

  if (!response.ok) {
    const error = readApiError(payload, "The note could not be edited.")

    throw new WallApiError(error.message, response.status, error.code)
  }

  if (
    !isRecord(payload) ||
    payload.id !== id ||
    typeof payload.body !== "string" ||
    typeof payload.editedAt !== "string" ||
    !Number.isFinite(Date.parse(payload.editedAt))
  ) {
    throw new Error("The wall service returned an invalid edit response.")
  }

  return { id: payload.id, body: payload.body, editedAt: payload.editedAt }
}

export async function deletePin(id: string): Promise<DeletePinResponse> {
  const token = await csrfToken()
  const response = await fetch(`/api/pins/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "same-origin",
    headers: { Accept: "application/json", "X-CSRF-Token": token },
  })

  const payload: unknown = await response.json()

  if (!response.ok) {
    const error = readApiError(payload, "The note could not be deleted.")

    throw new WallApiError(error.message, response.status, error.code)
  }

  if (
    !isRecord(payload) ||
    payload.id !== id ||
    typeof payload.wallDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(payload.wallDate)
  ) {
    throw new Error("The wall service returned an invalid delete response.")
  }

  return { id: payload.id, wallDate: payload.wallDate }
}

export async function togglePinReaction(
  id: string,
  kind: ReactionKind,
): Promise<ToggleReactionResponse> {
  const response = await fetch(
    `/api/pins/${encodeURIComponent(id)}/reactions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ deviceToken: getDeviceToken(), kind }),
    },
  )

  const payload: unknown = await response.json()

  if (!response.ok) {
    const error = readApiError(payload, "Your reaction could not be saved.")

    throw new WallApiError(error.message, response.status, error.code)
  }

  if (
    !isRecord(payload) ||
    payload.pinId !== id ||
    !isReactionCounts(payload.reactionCounts) ||
    !isReactionState(payload.myReactions)
  ) {
    throw new Error("The wall service returned an invalid reaction response.")
  }

  return {
    pinId: payload.pinId,
    reactionCounts: payload.reactionCounts,
    myReactions: payload.myReactions,
  }
}

export async function reportPin(id: string): Promise<ReportPinResponse> {
  const response = await fetch(`/api/pins/${encodeURIComponent(id)}/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ deviceToken: getDeviceToken() }),
  })

  const payload: unknown = await response.json()

  if (!response.ok) {
    const error = readApiError(payload, "The report could not be submitted.")

    throw new WallApiError(error.message, response.status, error.code)
  }

  if (
    !isRecord(payload) ||
    typeof payload.id !== "string" ||
    payload.pinId !== id ||
    typeof payload.createdAt !== "string" ||
    !Number.isFinite(Date.parse(payload.createdAt))
  ) {
    throw new Error("The wall service returned an invalid report response.")
  }

  return {
    id: payload.id,
    pinId: payload.pinId,
    createdAt: payload.createdAt,
  }
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
