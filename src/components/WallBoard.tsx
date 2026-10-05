import { useEffect, useRef, useState } from "react"

import type { PointerEvent as ReactPointerEvent } from "react"

import { WALL_CONFIG } from "../config"

import Icon from "./Icon"

import NoteCard from "./NoteCard"

import type { Note } from "../data/mock"

import { noteLightbox } from "../stores/note-lightbox"
import { consumeIncomingMockPinId, loadMockPins } from "../stores/mock-pins"
import {
  fetchWall,
  getDeviceToken,
  movePin,
  WallApiError,
} from "../lib/wall-client"
import { wallData } from "../stores/wall-data"

interface WallBoardProps {
  incomingId?: number | null

  interactive?: boolean
}

interface Position {
  x: number
  y: number
}

function logWallLoadError(error: unknown) {
  console.error(
    "Unable to load the Freedom Wall.",
    error instanceof Error ? error.message : String(error),
  )
}

export default function WallBoard({
  incomingId = null,

  interactive = true,
}: WallBoardProps) {
  const [wallNotes, setWallNotes] = useState<Note[]>([])
  const [wallError, setWallError] = useState("")
  const [newNoteId] = useState(consumeIncomingMockPinId)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const [scale, setScale] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 700 ? 0.55 : 0.82,
  )

  const [positions, setPositions] = useState<Record<string, Position>>({})

  const [movablePinIds, setMovablePinIds] = useState<Set<string>>(
    () => new Set(),
  )

  const pointerRef = useRef<Map<number, Position>>(new Map())

  const gestureRef = useRef<{
    id?: number

    noteId?: string

    startX: number

    startY: number

    originX: number

    originY: number

    moved: boolean

    position?: Position

    distance?: number

    startScale?: number
  } | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetchWall(undefined, controller.signal, getDeviceToken())
      .then((wall) => {
        setWallNotes([...loadMockPins().reverse(), ...wall.pins])
        setMovablePinIds(
          new Set(
            wall.pins.filter((note) => note.canMove).map((note) => note.id),
          ),
        )
        wallData.set({ resetsAt: wall.resetsAt })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return

        logWallLoadError(error)
        setWallError(
          error instanceof Error
            ? error.message
            : "The wall could not be loaded right now.",
        )
      })

    return () => controller.abort()
  }, [])

  function startPointer(
    event: ReactPointerEvent<HTMLDivElement>,
    noteId?: string,
  ) {
    if (
      !interactive ||
      (event.target instanceof Element &&
        event.target.closest(".wall-controls"))
    ) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)

    pointerRef.current.set(event.pointerId, {
      x: event.clientX,

      y: event.clientY,
    })

    if (pointerRef.current.size === 2) {
      const [a, b] = [...pointerRef.current.values()]

      gestureRef.current = {
        startX: 0,

        startY: 0,

        originX: 0,

        originY: 0,

        moved: true,

        distance: Math.hypot(a.x - b.x, a.y - b.y),

        startScale: scale,
      }
    } else {
      const current = noteId
        ? positions[noteId] ||
          wallNotes.find((note) => String(note.id) === noteId) || {
            x: 0,
            y: 0,
          }
        : offset

      gestureRef.current = {
        id: event.pointerId,

        noteId,

        startX: event.clientX,

        startY: event.clientY,

        originX: current.x,

        originY: current.y,

        moved: false,
      }
    }
  }

  function movePointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (!interactive || !pointerRef.current.has(event.pointerId)) return

    pointerRef.current.set(event.pointerId, {
      x: event.clientX,

      y: event.clientY,
    })

    const gesture = gestureRef.current

    if (!gesture) return

    if (
      pointerRef.current.size >= 2 &&
      gesture.distance &&
      gesture.startScale
    ) {
      const [a, b] = [...pointerRef.current.values()]

      setScale(
        Math.max(
          0.4,

          Math.min(
            1.6,

            (gesture.startScale * Math.hypot(a.x - b.x, a.y - b.y)) /
              gesture.distance,
          ),
        ),
      )
    } else if (gesture.id === event.pointerId) {
      const dx = event.clientX - gesture.startX

      const dy = event.clientY - gesture.startY

      if (Math.hypot(dx, dy) > 5) gesture.moved = true

      if (!gesture.moved) return

      if (gesture.noteId) {
        const noteId = gesture.noteId
        const position = {
          x: gesture.originX + dx / scale,

          y: gesture.originY + dy / scale,
        }

        gesture.position = position

        setPositions((previous) => ({
          ...previous,

          [noteId]: position,
        }))
      } else {
        setOffset({ x: gesture.originX + dx, y: gesture.originY + dy })
      }
    }
  }

  function endPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (!interactive) return

    const gesture = gestureRef.current
    const noteId = gesture?.noteId

    if (gesture?.id === event.pointerId && noteId) {
      if (!gesture.moved) {
        const note = wallNotes.find((item) => String(item.id) === noteId)

        if (note) noteLightbox.set({ note, notes: wallNotes })
      } else if (gesture.position && movablePinIds.has(noteId)) {
        const position = {
          x: Math.max(
            0,
            Math.min(WALL_CONFIG.logicalCanvasWidth, gesture.position.x),
          ),
          y: Math.max(
            0,
            Math.min(WALL_CONFIG.logicalCanvasHeight, gesture.position.y),
          ),
        }
        const originalPosition = {
          x: gesture.originX,
          y: gesture.originY,
        }

        setPositions((previous) => ({
          ...previous,
          [noteId]: position,
        }))

        void savePinPosition(noteId, position, originalPosition)
      }
    }

    pointerRef.current.delete(event.pointerId)

    gestureRef.current = null
  }

  async function savePinPosition(
    noteId: string,
    position: Position,
    originalPosition: Position,
  ) {
    try {
      await movePin(noteId, position)
      setWallError("")
    } catch (error) {
      console.error(
        "Unable to save the Freedom Wall note position.",
        error instanceof Error ? error.message : String(error),
      )
      setPositions((previous) => ({
        ...previous,
        [noteId]: originalPosition,
      }))
      setWallError(
        error instanceof WallApiError
          ? error.message
          : "The note position could not be saved.",
      )
    }
  }

  return (
    <div
      className={`wall-viewport ${interactive ? "wall-interactive" : ""}`}
      onPointerDown={(event) => {
        const button = (event.target as HTMLElement).closest("[data-note-id]")

        startPointer(
          event,

          button?.getAttribute("data-note-id") ?? undefined,
        )
      }}
      onPointerMove={movePointer}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    >
      <div
        className="wall-canvas"
        style={{
          transform: `translate(calc(-50% + ${offset.x}px), ${offset.y}px) scale(${scale})`,
        }}
      >
        <div className="wall-scrawl wall-scrawl-one">
          leave a little of yourself here ♡
        </div>
        <div className="wall-scrawl wall-scrawl-two">FOUNDED 1992</div>
        {wallNotes.map((note) => {
          const noteId = String(note.id)
          const position = positions[noteId] || note

          return (
            <div
              data-note-id={noteId}
              className={`wall-note-position ${
                incomingId === note.id || newNoteId === note.id ? "is-new" : ""
              }`}
              key={note.id}
              style={{
                left: position.x,

                top: position.y,

                transform: `rotate(${note.rotation}deg)`,
              }}
            >
              <NoteCard
                note={note}
                onClick={(event) => {
                  if (event.detail === 0) {
                    noteLightbox.set({ note, notes: wallNotes })
                  }
                }}
              />
            </div>
          )
        })}
      </div>
      {wallError && (
        <p className="wall-load-error" role="alert">
          {wallError}
        </p>
      )}
      {interactive && (
        <div className="wall-controls">
          <span>
            <Icon name="hand" size={16} /> Drag to explore
          </span>
          <div className="zoom-buttons">
            <button
              aria-label="Zoom out"
              onClick={() =>
                setScale((scale) => Math.max(0.4, +(scale - 0.15).toFixed(2)))
              }
            >
              <Icon name="minus" size={17} />
            </button>
            <span>{Math.round(scale * 100)}%</span>
            <button
              aria-label="Zoom in"
              onClick={() =>
                setScale((scale) => Math.min(1.6, +(scale + 0.15).toFixed(2)))
              }
            >
              <Icon name="plus" size={17} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
