import { useEffect, useState } from "react"

import { useStore } from "@nanostores/react"

import Icon from "./Icon"

import NoteCard from "./NoteCard"

import {
  mockReactionCounts,
  type NoteReactionCounts,
  type NoteReactionState,
  type ReactionKind,
} from "../data/mock"

import { noteLightbox } from "../stores/note-lightbox"
import { reportPin, togglePinReaction } from "../lib/wall-client"

export default function NoteLightbox() {
  const { note, notes } = useStore(noteLightbox)

  const [mockReacted, setMockReacted] = useState<Record<string, boolean>>({})

  const [reactionCounts, setReactionCounts] =
    useState<NoteReactionCounts>(mockReactionCounts)

  const [myReactions, setMyReactions] = useState<NoteReactionState>({
    love: false,
    relate: false,
    nostalgia: false,
  })

  const [pendingReactions, setPendingReactions] = useState<
    Set<ReactionKind>
  >(new Set())

  const [reactionError, setReactionError] = useState("")

  const [reported, setReported] = useState(false)

  const [reportPending, setReportPending] = useState(false)

  const [reportError, setReportError] = useState("")

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
    setReportPending(false)
    setReportError("")
  }

  async function submitReport() {
    if (!note || reported || reportPending) return

    if (typeof note.id === "number") {
      setReported(true)
      return
    }

    const reportPinId = note.id
    setReportError("")
    setReportPending(true)

    try {
      await reportPin(reportPinId)
      if (noteLightbox.get().note?.id === reportPinId) {
        setReported(true)
      }
    } catch (error) {
      console.error(
        "Unable to submit the note report.",
        error instanceof Error ? error.message : String(error),
      )
      if (noteLightbox.get().note?.id === reportPinId) {
        setReportError(
          error instanceof Error
            ? error.message
            : "The report could not be submitted.",
        )
      }
    } finally {
      if (noteLightbox.get().note?.id === reportPinId) {
        setReportPending(false)
      }
    }
  }

  async function toggleReaction(kind: ReactionKind) {
    if (!note || pendingReactions.has(kind)) return

    if (typeof note.id === "number") {
      const key = `${note.id}-${kind}`
      setMockReacted((previous) => ({
        ...previous,
        [key]: !previous[key],
      }))
      return
    }

    setReactionError("")
    setPendingReactions((previous) => new Set(previous).add(kind))

    try {
      const result = await togglePinReaction(note.id, kind)
      const updatedNote = {
        ...note,
        reactionCounts: result.reactionCounts,
        myReactions: result.myReactions,
      }

      setReactionCounts(result.reactionCounts)
      setMyReactions(result.myReactions)
      noteLightbox.set({
        note: updatedNote,
        notes: notes.map((item) =>
          item.id === updatedNote.id ? updatedNote : item,
        ),
      })
    } catch (error) {
      console.error(
        "Unable to save the note reaction.",
        error instanceof Error ? error.message : String(error),
      )
      setReactionError(
        error instanceof Error
          ? error.message
          : "Your reaction could not be saved.",
      )
    } finally {
      setPendingReactions((previous) => {
        const next = new Set(previous)
        next.delete(kind)
        return next
      })
    }
  }

  useEffect(() => {
    setReactionCounts(note?.reactionCounts ?? mockReactionCounts)
    setMyReactions(
      note?.myReactions ?? { love: false, relate: false, nostalgia: false },
    )
    setPendingReactions(new Set())
    setReactionError("")
  }, [note?.id, note?.reactionCounts, note?.myReactions])

  useEffect(() => {
    setReported(false)
    setReportPending(false)
    setReportError("")
  }, [note?.id])

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
              { kind: "love", name: "heart", label: "Love" },

              { kind: "relate", name: "smile", label: "Relate" },

              { kind: "nostalgia", name: "spark", label: "Nostalgia" },
            ] as const).map((reaction) => {
              const key = `${note.id}-${reaction.kind}`
              const isMockNote = typeof note.id === "number"
              const isReacted = isMockNote
                ? mockReacted[key] ?? false
                : myReactions[reaction.kind]
              const count = isMockNote
                ? mockReactionCounts[reaction.kind] + (isReacted ? 1 : 0)
                : reactionCounts[reaction.kind]

              return (
                <button
                  key={key}
                  className={isReacted ? "reacted" : ""}
                  onClick={() => void toggleReaction(reaction.kind)}
                >
                  <Icon name={reaction.name} size={17} /> {reaction.label}{" "}
                  <span>{count}</span>
                </button>
              )
            })}
          </div>
          {reactionError && <span role="alert">{reactionError}</span>}
          <button
            className="report-button"
            onClick={() => void submitReport()}
          >
            <Icon name="flag" size={16} />{" "}
            {reported ? "Reported · thank you" : "Report"}
          </button>
          {reportError && <span role="alert">{reportError}</span>}
        </div>
      </div>
    </div>
  )
}
