import { useEffect, useState } from "react"

import Icon from "./Icon"

import NoteCard from "./NoteCard"

import { noteLightbox } from "../stores/note-lightbox"
import {
  fetchArchiveDate,
  fetchArchiveDays,
  type ArchiveDay,
  type WallNote,
} from "../lib/wall-client"

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export default function ArchiveCalendar() {
  const todayParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const todayYear = Number(
    todayParts.find((part) => part.type === "year")?.value,
  )
  const todayMonth = Number(
    todayParts.find((part) => part.type === "month")?.value,
  )
  const todayDay = Number(todayParts.find((part) => part.type === "day")?.value)
  const todayKey = `${todayYear}-${String(todayMonth).padStart(2, "0")}-${String(todayDay).padStart(2, "0")}`

  const [monthOffset, setMonthOffset] = useState(0)

  const currentMonth = new Date(todayYear, todayMonth - 1 + monthOffset, 1)

  const [selected, setSelected] = useState(() =>
    new Date(todayYear, todayMonth - 1, todayDay - 1),
  )

  const [archiveDays, setArchiveDays] = useState<ArchiveDay[]>([])

  const [archivePins, setArchivePins] = useState<WallNote[]>([])

  const [archiveCount, setArchiveCount] = useState(0)

  const [calendarError, setCalendarError] = useState("")

  const [archiveError, setArchiveError] = useState("")

  const currentMonthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`

  const selectedDateKey = formatDateKey(selected)

  useEffect(() => {
    const controller = new AbortController()

    fetchArchiveDays(currentMonthKey, controller.signal)
      .then((response) => {
        setArchiveDays(response.days)
        setCalendarError("")
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return

        console.error(
          "Unable to load archive calendar days.",
          error instanceof Error ? error.message : String(error),
        )
        setCalendarError(
          error instanceof Error
            ? error.message
            : "Archive days could not be loaded right now.",
        )
      })

    return () => controller.abort()
  }, [currentMonthKey])

  useEffect(() => {
    const controller = new AbortController()

    setArchivePins([])
    setArchiveCount(0)
    setArchiveError("")

    fetchArchiveDate(selectedDateKey, controller.signal)
      .then((response) => {
        setArchivePins(response.pins)
        setArchiveCount(response.count)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return

        console.error(
          "Unable to load archived notes.",
          error instanceof Error ? error.message : String(error),
        )
        setArchiveError(
          error instanceof Error
            ? error.message
            : "Archive notes could not be loaded right now.",
        )
      })

    return () => controller.abort()
  }, [selectedDateKey])

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

  const storiesByDate = new Map(
    archiveDays.map((day) => [day.date, day.count]),
  )

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

            const dateKey = formatDateKey(date)
            const future = dateKey >= todayKey

            return (
              <button
                key={index}
                disabled={future}
                className={
                  dateKey === selectedDateKey ? "selected-day" : ""
                }
                onClick={() => setSelected(date)}
              >
                {index + 1}
                {!future && (storiesByDate.get(dateKey) ?? 0) > 0 && <span />}
              </button>
            )
          })}
        </div>
        {calendarError && <span role="alert">{calendarError}</span>}
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
            <p>{archiveCount} notes left on this wall</p>
            {archiveError && <span role="alert">{archiveError}</span>}
          </div>
          <button
            className="text-link"
            onClick={() => window.location.assign("/wall")}
          >
            Today&apos;s wall <Icon name="arrow" size={17} />
          </button>
        </div>
        <div className="archive-wall">
          {archivePins.slice(0, 8).map((note) => (
            <div
              key={note.id}
              style={{ transform: `rotate(${note.rotation}deg)` }}
            >
              <NoteCard
                note={note}
                compact
                onClick={() =>
                  noteLightbox.set({ note, notes: archivePins })
                }
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
