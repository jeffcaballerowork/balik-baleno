import { useRef, useState } from "react"

import type { PointerEvent as ReactPointerEvent } from "react"

import Icon from "./Icon"

import NoteCard from "./NoteCard"

import { initialNotes } from "../data/mock"

import { noteLightbox } from "../stores/note-lightbox"
import { consumeIncomingMockPinId, loadMockPins } from "../stores/mock-pins"

interface WallBoardProps {
  notes?: typeof initialNotes

  incomingId?: number | null

  interactive?: boolean
}

interface Position {
  x: number
  y: number
}

export default function WallBoard({
  notes = initialNotes,

  incomingId = null,

  interactive = true,
}: WallBoardProps) {
  const [wallNotes] = useState(() => [...loadMockPins().reverse(), ...notes])
  const [newNoteId] = useState(consumeIncomingMockPinId)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const [scale, setScale] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 700 ? 0.55 : 0.82,
  )

  const [positions, setPositions] = useState<Record<number, Position>>({})

  const pointerRef = useRef<Map<number, Position>>(new Map())

  const gestureRef = useRef<{
    id?: number

    noteId?: number

    startX: number

    startY: number

    originX: number

    originY: number

    moved: boolean

    distance?: number

    startScale?: number
  } | null>(null)

  function startPointer(
    event: ReactPointerEvent<HTMLDivElement>,
    noteId?: number,
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
          wallNotes.find((note) => note.id === noteId) || { x: 0, y: 0 }
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
        setPositions((previous) => ({
          ...previous,

          [gesture.noteId!]: {
            x: gesture.originX + dx / scale,

            y: gesture.originY + dy / scale,
          },
        }))
      } else {
        setOffset({ x: gesture.originX + dx, y: gesture.originY + dy })
      }
    }
  }

  function endPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (!interactive) return

    const gesture = gestureRef.current

    if (gesture?.id === event.pointerId && gesture.noteId && !gesture.moved) {
      const note = wallNotes.find((item) => item.id === gesture.noteId)

      if (note) noteLightbox.set({ note, notes: wallNotes })
    }

    pointerRef.current.delete(event.pointerId)

    gestureRef.current = null
  }

  return (
    <div
      className={`wall-viewport ${interactive ? "wall-interactive" : ""}`}
      onPointerDown={(event) => {
        const button = (event.target as HTMLElement).closest("[data-note-id]")

        startPointer(
          event,

          button ? Number(button.getAttribute("data-note-id")) : undefined,
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
          const position = positions[note.id] || note

          return (
            <div
              data-note-id={note.id}
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
                    noteLightbox.set({ note, notes })
                  }
                }}
              />
            </div>
          )
        })}
      </div>
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
