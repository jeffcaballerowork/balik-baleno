import { useState } from "react"

import Icon from "./Icon"

import NoteCard from "./NoteCard"

import { initialNotes } from "../data/mock"

import { noteLightbox } from "../stores/note-lightbox"

export default function ArchiveCalendar() {
  const today = new Date()

  const [monthOffset, setMonthOffset] = useState(0)

  const currentMonth = new Date(
    today.getFullYear(),

    today.getMonth() + monthOffset,

    1,
  )

  const [selected, setSelected] = useState(
    new Date(
      today.getFullYear(),

      today.getMonth(),

      Math.max(1, today.getDate() - 1),
    ),
  )

  const daysInMonth = new Date(
    currentMonth.getFullYear(),

    currentMonth.getMonth() + 1,

    0,
  ).getDate()

  const leadingDays = new Date(
    currentMonth.getFullYear(),

    currentMonth.getMonth(),

    1,
  ).getDay()

  const archivedNotes = initialNotes

    .filter((_, index) => (index + selected.getDate()) % 3 !== 0)

    .slice(0, 13)

  return (
    <div className="archive-layout">
      <div className="calendar-card">
        <div className="calendar-card-top">
          <Icon name="calendar" size={19} />
          <span>CHOOSE A DAY</span>
        </div>
        <div className="calendar-header">
          <h2>
            {currentMonth.toLocaleDateString("en-US", {
              month: "long",

              year: "numeric",
            })}
          </h2>
          <div>
            <button
              aria-label="Previous month"
              onClick={() => setMonthOffset((offset) => offset - 1)}
            >
              <Icon name="chevronLeft" size={19} />
            </button>
            <button
              aria-label="Next month"
              disabled={monthOffset >= 0}
              onClick={() => setMonthOffset((offset) => offset + 1)}
            >
              <Icon name="chevronRight" size={19} />
            </button>
          </div>
        </div>
        <div className="calendar-grid">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
            <span className="calendar-weekday" key={day}>
              {day}
            </span>
          ))}
          {Array.from({ length: leadingDays }, (_, index) => (
            <span key={`empty-${index}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const date = new Date(
              currentMonth.getFullYear(),

              currentMonth.getMonth(),

              index + 1,
            )

            const future =
              date >=
              new Date(today.getFullYear(), today.getMonth(), today.getDate())

            return (
              <button
                key={index}
                disabled={future}
                className={
                  date.toDateString() === selected.toDateString()
                    ? "selected-day"
                    : ""
                }
                onClick={() => setSelected(date)}
              >
                {index + 1}
                {!future && <span />}
              </button>
            )
          })}
        </div>
        <div className="calendar-foot">
          <span className="calendar-dot" /> Days with stories to tell
        </div>
      </div>
      <div className="archive-preview">
        <div className="archive-preview-head">
          <div>
            <span className="eyebrow">A DAY TO REMEMBER</span>
            <h2>
              {selected.toLocaleDateString("en-US", {
                month: "long",

                day: "numeric",

                year: "numeric",
              })}
            </h2>
            <p>{archivedNotes.length} notes left on this wall</p>
          </div>
          <button
            className="text-link"
            onClick={() => window.location.assign("/wall")}
          >
            Today&apos;s wall <Icon name="arrow" size={17} />
          </button>
        </div>
        <div className="archive-wall">
          {archivedNotes.slice(0, 8).map((note) => (
            <div
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
        <p className="archive-caption">
          Some days are worth holding onto. <span>✳</span>
        </p>
      </div>
    </div>
  )
}
