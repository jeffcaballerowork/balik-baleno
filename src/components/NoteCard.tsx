import type { CSSProperties, MouseEvent, PointerEvent } from "react"

import { campusPhoto, type Note } from "../data/mock"

interface NoteCardProps {
  note: Note

  compact?: boolean

  edited?: boolean

  onClick?: (event: MouseEvent<HTMLButtonElement>) => void

  style?: CSSProperties

  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void
}

export default function NoteCard({
  note,

  compact = false,

  edited = false,

  onClick,

  style,

  onPointerDown,
}: NoteCardProps) {
  return (
    <button
      type="button"
      className={`note note-${note.kind} ${
        note.color ? `note-${note.color}` : ""
      } ${note.font === "serif" ? "note-font-serif" : ""} ${
        compact ? "note-compact" : ""
      }`}
      style={{ ...style, color: note.ink }}
      onClick={onClick}
      onPointerDown={onPointerDown}
      aria-label={`Note from ${note.author || "an alum"}: ${note.text}`}
    >
      <span className="pushpin" aria-hidden="true" />
      {note.kind === "polaroid" && (
        <span className="note-photo">
          <img
            src={note.image || campusPhoto}
            alt="A memory from school"
            draggable={false}
          />
        </span>
      )}
      <span className="note-copy">{note.text}</span>
      {note.author && <span className="note-author">{`— ${note.author}${edited ? " · edited" : ""}`}</span>}
      {note.doodle && <span className="note-doodle">{note.doodle}</span>}
      {note.drawing && (
        <svg className="note-drawing" viewBox="0 0 240 240" aria-hidden="true">
          <g
            fill="none"
            stroke={note.ink || "#020202"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {note.drawing.map((path, index) => (
              <path d={path} key={index} />
            ))}
          </g>
        </svg>
      )}
    </button>
  )
}
