import { useEffect, useState } from "react"

import Icon from "./Icon"

import NoteCard from "./NoteCard"

import { homeMock, type Note } from "../data/mock"

import { noteLightbox } from "../stores/note-lightbox"
import {
  fetchWall,
  formatWallCountdown,
  getDeviceToken,
  type WallNote,
} from "../lib/wall-client"
import { wallData } from "../stores/wall-data"

export default function HeroWall() {
  const [pins, setPins] = useState<WallNote[]>([])
  const [resetsAt, setResetsAt] = useState<string | null>(null)
  const [wallError, setWallError] = useState("")

  useEffect(() => {
    const controller = new AbortController()

    fetchWall(undefined, controller.signal, getDeviceToken())
      .then((wall) => {
        setPins(wall.pins)
        setResetsAt(wall.resetsAt)
        wallData.set({ resetsAt: wall.resetsAt })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return

        console.error(
          "Unable to load the Freedom Wall preview.",
          error instanceof Error ? error.message : String(error),
        )
        setWallError("The Freedom Wall preview could not be loaded.")
      })

    return () => controller.abort()
  }, [])

  const notes: Note[] = [...pins].sort(
    (first, second) => first.zIndex - second.zIndex,
  )
  const countdown = resetsAt ? formatWallCountdown(resetsAt) : "--"

  return (
    <div className="hero-visual">
      <div className="hero-visual-top">
        <span>
          <span className="live-dot" /> TODAY&apos;S FREEDOM WALL
        </span>
        <span>{`NO. ${homeMock.wallNumber}`}</span>
      </div>
      <div className="hero-wall">
        <span className="wall-chalk">our stories live here</span>
        {wallError && (
          <span className="wall-preview-error" role="alert">
            {wallError}
          </span>
        )}
        {notes.slice(0, 8).map((note, index) => (
          <div
            className={`preview-note preview-note-${index}`}
            key={note.id}
            style={{ transform: `rotate(${note.rotation}deg)` }}
          >
            <NoteCard
              note={note}
              compact
              onClick={() => noteLightbox.set({ note, notes: pins })}
            />
          </div>
        ))}
      </div>
      <div className="hero-visual-bottom">
        <span>
          <Icon name="clock" size={16} /> Wall resets in{" "}
          <strong>{countdown}</strong>
        </span>
        <button data-nav="/wall">
          See the full wall <Icon name="arrow" size={16} />
        </button>
      </div>
    </div>
  )
}
