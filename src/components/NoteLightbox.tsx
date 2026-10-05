import { useEffect, useState } from "react"

import { useStore } from "@nanostores/react"

import Icon from "./Icon"

import NoteCard from "./NoteCard"

import { noteLightbox } from "../stores/note-lightbox"

export default function NoteLightbox() {
  const { note, notes } = useStore(noteLightbox)

  const [reacted, setReacted] = useState<Record<string, boolean>>({})

  const [reported, setReported] = useState(false)

  const index = note ? notes.findIndex((item) => item.id === note.id) : -1

  function close() {
    noteLightbox.set({ note: null, notes: [] })
  }

  function selectNote(nextIndex: number) {
    if (notes.length === 0) return

    noteLightbox.set({
      note: notes[(nextIndex + notes.length) % notes.length],

      notes,
    })

    setReported(false)
  }

  useEffect(() => {
    if (!note) return

    function keyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close()

      if (event.key === "ArrowRight") selectNote(index + 1)

      if (event.key === "ArrowLeft") selectNote(index - 1)
    }

    window.addEventListener("keydown", keyDown)

    return () => window.removeEventListener("keydown", keyDown)
  }, [index, note, notes])

  if (!note) return null

  return (
    <div
      className="lightbox-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div
        className="lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="Read a note"
      >
        <div className="lightbox-top">
          <span>
            FROM THE FREEDOM WALL <span>✳</span> NOTE{" "}
            {String(index + 1).padStart(2, "0")}/
            {String(notes.length).padStart(2, "0")}
          </span>
          <button onClick={close} aria-label="Close note">
            <Icon name="close" size={22} />
          </button>
        </div>
        <div className="lightbox-main">
          <button
            className="lightbox-nav"
            aria-label="Previous note"
            onClick={() => selectNote(index - 1)}
          >
            <Icon name="chevronLeft" size={25} />
          </button>
          <div className="lightbox-paper">
            <NoteCard note={note} />
          </div>
          <button
            className="lightbox-nav"
            aria-label="Next note"
            onClick={() => selectNote(index + 1)}
          >
            <Icon name="chevronRight" size={25} />
          </button>
        </div>
        <div className="lightbox-bottom">
          <div className="reaction-buttons">
            {([
              { name: "heart", label: "Love", count: 24 },

              { name: "smile", label: "Relate", count: 12 },

              { name: "spark", label: "Nostalgia", count: 8 },
            ] as const).map((reaction) => {
              const key = `${note.id}-${reaction.label}`

              return (
                <button
                  key={key}
                  className={reacted[key] ? "reacted" : ""}
                  onClick={() =>
                    setReacted((previous) => ({
                      ...previous,

                      [key]: !previous[key],
                    }))
                  }
                >
                  <Icon name={reaction.name} size={17} /> {reaction.label}{" "}
                  <span>{reaction.count + (reacted[key] ? 1 : 0)}</span>
                </button>
              )
            })}
          </div>
          <button className="report-button" onClick={() => setReported(true)}>
            <Icon name="flag" size={16} />{" "}
            {reported ? "Reported · thank you" : "Report"}
          </button>
        </div>
      </div>
    </div>
  )
}
