import { useRef, useState } from "react"

import type { PointerEvent as ReactPointerEvent } from "react"

import Icon from "./Icon"

import type { Note, NoteKind } from "../data/mock"

import { saveMockPin } from "../stores/mock-pins"

interface TemplateOption {
  id: NoteKind
  name: string
}

const templateNames: TemplateOption[] = [
  { id: "sticky", name: "Sticky note" },

  { id: "torn", name: "Torn paper" },

  { id: "notebook", name: "Notebook" },

  { id: "polaroid", name: "Polaroid" },
]

export default function CreateEditor() {
  const [template, setTemplate] = useState<NoteKind>("sticky")

  const [text, setText] = useState("")

  const [author, setAuthor] = useState("")

  const [anonymous, setAnonymous] = useState(false)

  const [ink, setInk] = useState("#020202")

  const [font, setFont] = useState<"hand" | "serif">("hand")

  const [sticker, setSticker] = useState("")

  const [image, setImage] = useState("")

  const [drawing, setDrawing] = useState(false)

  const [paths, setPaths] = useState<string[]>([])

  const [pinning, setPinning] = useState(false)

  const drawingRef = useRef(false)

  const currentPath = useRef("")

  const fileRef = useRef<HTMLInputElement>(null)

  function drawPoint(event: ReactPointerEvent<SVGSVGElement>, start = false) {
    const rect = event.currentTarget.getBoundingClientRect()

    const x = Math.round(((event.clientX - rect.left) / rect.width) * 240)

    const y = Math.round(((event.clientY - rect.top) / rect.height) * 240)

    currentPath.current += `${start ? "M" : " L"}${x} ${y}`

    setPaths((previous) => [...previous.slice(0, -1), currentPath.current])
  }

  function pinNote() {
    if ((!text.trim() && !image && paths.length === 0) || pinning) return

    setPinning(true)

    const note: Note = {
      id: Date.now(),

      kind: template,

      text:
        text.trim() ||
        (image ? "A little memory from me" : "A little something I made"),

      author: anonymous ? "Anonymous" : author.trim() || "A fellow alum",

      x: 520,

      y: 320,

      rotation: -4,

      image: image || undefined,

      doodle: sticker || undefined,

      drawing: paths.filter(Boolean),

      ink,

      font,

      color: template === "sticky" ? "yellow" : undefined,
    }

    window.setTimeout(() => {
      saveMockPin(note)

      window.location.assign("/wall")
    }, 500)
  }

  return (
    <main className="create-page content-width">
      <button className="back-link" data-nav="/wall">
        <Icon name="arrowLeft" size={17} /> Back to the wall
      </button>
      <div className="page-heading create-heading">
        <span className="eyebrow">
          <span className="eyebrow-line" /> MAKE YOUR MARK
        </span>
        <h1>
          Leave a little <em>something.</em>
        </h1>
        <p>
          A memory, a doodle, a shout-out, a poem. There&apos;s no wrong way to
          be here.
        </p>
      </div>
      <div className="editor-layout">
        <div className="editor-panel">
          <div className="editor-panel-head">
            <span>01 / MAKE IT YOURS</span>
            <Icon name="spark" size={19} />
          </div>
          <div className="editor-field">
            <label>Pick your paper</label>
            <div className="template-grid">
              {templateNames.map((item) => (
                <button
                  key={item.id}
                  className={`template-option ${
                    template === item.id ? "selected" : ""
                  }`}
                  onClick={() => setTemplate(item.id)}
                >
                  <span className={`template-swatch note-${item.id}`} />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="editor-field">
            <label htmlFor="note-text">What&apos;s on your mind?</label>
            <textarea
              id="note-text"
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, 220))}
              placeholder="It all started when..."
              rows={5}
            />
            <span className="character-count">
              {text.length} / 220 characters
            </span>
          </div>
          <div className="editor-field">
            <label>Make it feel like you</label>
            <div className="editor-tools">
              <button
                className={font === "hand" ? "tool-active" : ""}
                onClick={() => setFont("hand")}
                title="Handwriting font"
              >
                <span className="tool-hand">Aa</span> Handwritten
              </button>
              <button
                className={font === "serif" ? "tool-active" : ""}
                onClick={() => setFont("serif")}
                title="Classic font"
              >
                <span className="tool-serif">Aa</span> Classic
              </button>
              <button
                className={drawing ? "tool-active" : ""}
                onClick={() => setDrawing(!drawing)}
              >
                <Icon name="pen" size={16} /> Draw
              </button>
              <button onClick={() => fileRef.current?.click()}>
                <Icon name="upload" size={16} /> Photo
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]

                  if (file) {
                    const reader = new FileReader()

                    reader.onload = () => {
                      setImage(String(reader.result))

                      setTemplate("polaroid")
                    }

                    reader.readAsDataURL(file)
                  }
                }}
              />
            </div>
            <div className="ink-row">
              <span>Ink color</span>
              {["#020202", "#8B1E1A", "#010066", "#1B1A5F"].map((color) => (
                <button
                  key={color}
                  className={ink === color ? "ink-selected" : ""}
                  style={{ backgroundColor: color }}
                  onClick={() => setInk(color)}
                  aria-label={`Use ${color} ink`}
                />
              ))}
            </div>
            <div className="sticker-row">
              <span>Little extras</span>
              {["♡", "✳", "✦", "☼", "✿"].map((item) => (
                <button
                  key={item}
                  className={sticker === item ? "sticker-selected" : ""}
                  onClick={() => setSticker(sticker === item ? "" : item)}
                  aria-label={`Add ${item} sticker`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="editor-field author-field">
            <label htmlFor="note-author">Signed by</label>
            <input
              id="note-author"
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder="Your name & class year (optional)"
              disabled={anonymous}
            />
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(event) => setAnonymous(event.target.checked)}
              />
              <span className="toggle-track" /> Post anonymously{" "}
              <span className="toggle-hint">
                — your secret&apos;s safe with us
              </span>
            </label>
          </div>
        </div>
        <div className="preview-panel">
          <div className="preview-panel-head">
            <span>02 / THE PREVIEW</span>
            <span>THIS ONE&apos;S ALL YOURS</span>
          </div>
          <div className="preview-stage">
            <div className="preview-stage-label">
              A LITTLE SPACE JUST FOR YOU <span>✳</span>
            </div>
            <div
              className={`editor-note note-${template} ${
                template === "sticky" ? "note-yellow" : ""
              } ${pinning ? "note-pinning" : ""}`}
            >
              <span className="pushpin" />
              {template === "polaroid" && (
                <div className="editor-photo">
                  {image ? (
                    <img src={image} alt="Your uploaded memory" />
                  ) : (
                    <>
                      <Icon name="image" size={34} />
                      <span>
                        Add a photo
                        <br />
                        to your note
                      </span>
                    </>
                  )}
                </div>
              )}
              <div
                className={`editor-note-text ${
                  font === "serif" ? "editor-serif" : ""
                }`}
                style={{ color: ink }}
              >
                {text || (
                  <span className="placeholder-text">
                    Your story goes here...
                  </span>
                )}
              </div>
              {sticker && <span className="editor-sticker">{sticker}</span>}
              <span className="editor-note-author">
                — {anonymous ? "Anonymous" : author || "Your name"}
              </span>
              {drawing && (
                <svg
                  className="drawing-layer"
                  viewBox="0 0 240 240"
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId)

                    drawingRef.current = true

                    currentPath.current = ""

                    setPaths((previous) => [...previous, ""])

                    drawPoint(event, true)
                  }}
                  onPointerMove={(event) => {
                    if (drawingRef.current) drawPoint(event)
                  }}
                  onPointerUp={() => {
                    drawingRef.current = false
                  }}
                >
                  <g
                    fill="none"
                    stroke={ink}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {paths.map((path, index) => (
                      <path d={path} key={index} />
                    ))}
                  </g>
                </svg>
              )}
              {!drawing && paths.length > 0 && (
                <svg className="drawing-display" viewBox="0 0 240 240">
                  <g
                    fill="none"
                    stroke={ink}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {paths.map((path, index) => (
                      <path d={path} key={index} />
                    ))}
                  </g>
                </svg>
              )}
            </div>
            <div className="preview-stage-caption">
              {pinning
                ? "Your note is on its way to the wall..."
                : drawing
                  ? "Draw directly on your note. Tap Draw again when done."
                  : "Just like the real thing, but without the glue."}
            </div>
          </div>
          <div className="preview-submit">
            <p>
              Your note will appear on today&apos;s wall for everyone to see.
            </p>
            <button
              className="button button-primary"
              disabled={
                pinning || (!text.trim() && !image && paths.length === 0)
              }
              onClick={pinNote}
            >
              <Icon name="pin" size={19} />{" "}
              {pinning ? "Pinning..." : "Pin it to the wall"}{" "}
              <Icon name="arrow" size={18} />
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
