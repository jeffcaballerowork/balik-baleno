import Icon from "./Icon"

import NoteCard from "./NoteCard"

import { homeMock, homePreviewNotes, initialNotes } from "../data/mock"

import { noteLightbox } from "../stores/note-lightbox"

export default function HeroWall() {
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
        {homePreviewNotes.map((note, index) => (
          <div
            className={`preview-note preview-note-${index}`}
            key={note.id}
            style={{ transform: `rotate(${note.rotation}deg)` }}
          >
            <NoteCard
              note={note}
              compact
              onClick={() => noteLightbox.set({ note, notes: initialNotes })}
            />
          </div>
        ))}
      </div>
      <div className="hero-visual-bottom">
        <span>
          <Icon name="clock" size={16} /> Wall resets in{" "}
          <strong>{homeMock.resetsIn}</strong>
        </span>
        <button data-nav="/wall">
          See the full wall <Icon name="arrow" size={16} />
        </button>
      </div>
    </div>
  )
}
