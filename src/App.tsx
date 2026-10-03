import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

type Page = "home" | "wall" | "create" | "archive" | "news" | "events" | "batches" | "batch";
type NoteKind = "sticky" | "torn" | "notebook" | "polaroid" | "card";
type Note = { id: number; kind: NoteKind; text: string; author: string; x: number; y: number; rotation: number; color?: string; image?: string; doodle?: string; drawing?: string[]; ink?: string; font?: "hand" | "serif" };

const campusPhoto = "https://images.unsplash.com/photo-1567878874047-4ee47c135328?w=900&q=85";
const graduationPhoto = "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=900&q=85";
const ivyPhoto = "https://images.unsplash.com/photo-1699152865865-a7d89bb16bf8?w=900&q=85";

const initialNotes: Note[] = [
  { id: 1, kind: "sticky", text: "To whoever needs to hear it: you are doing better than you think. ♡", author: "a friend from '18", x: 76, y: 78, rotation: -6, color: "yellow" },
  { id: 2, kind: "torn", text: "The bell still rings somewhere in my dreams. And somehow, we're all still running late.", author: "Mara, '15", x: 328, y: 57, rotation: 4 },
  { id: 3, kind: "polaroid", text: "The place where it all began", author: "Class of '19", x: 610, y: 71, rotation: -5, image: campusPhoto },
  { id: 4, kind: "sticky", text: "Anyone remember the canteen's legendary cheese rolls?", author: "Nico '12", x: 889, y: 53, rotation: 6, color: "pink" },
  { id: 5, kind: "notebook", text: "Roses are red,\nOur uniforms were blue,\nNo matter how far,\nThis place stays with you.", author: "Anonymous", x: 1130, y: 76, rotation: -3 },
  { id: 6, kind: "card", text: "CLASS OF '16\nREUNION!", author: "July 26 · The old courtyard", x: 121, y: 333, rotation: 5, color: "green" },
  { id: 7, kind: "sticky", text: "Shout-out to Ms. Rivera for believing in the quiet kids.", author: "still grateful", x: 371, y: 324, rotation: -4, color: "blue" },
  { id: 8, kind: "torn", text: "We grew up. We went places. But a part of us is still at that lunch table.", author: "Jules '17", x: 641, y: 350, rotation: 6 },
  { id: 9, kind: "sticky", text: "Dear 17-year-old me: it works out. Keep going.", author: "you, ten years later", x: 952, y: 340, rotation: -7, color: "yellow" },
  { id: 10, kind: "polaroid", text: "Forever our favorite corner", author: "", x: 1175, y: 342, rotation: 7, image: ivyPhoto },
  { id: 11, kind: "notebook", text: "The hallway was loud,\nbut the little moments\nwere everything.", author: "An old classmate", x: 49, y: 605, rotation: -3, doodle: "✳" },
  { id: 12, kind: "sticky", text: "Proud of everyone who made it through the hard days. You belong here.", author: "Sofia '21", x: 325, y: 617, rotation: 7, color: "pink" },
  { id: 13, kind: "card", text: "GOOD LUCK\nGRADUATES!", author: "The alumni family", x: 596, y: 619, rotation: -5, color: "mustard" },
  { id: 14, kind: "torn", text: "Found our old yearbook today. We really thought those haircuts were a good idea.", author: "Ben '14", x: 865, y: 610, rotation: 4 },
  { id: 15, kind: "sticky", text: "Let's make more memories, okay?", author: "Ari '20", x: 1134, y: 633, rotation: -5, color: "blue", doodle: "✿" },
  { id: 16, kind: "sticky", text: "The library steps at sunset. If you know, you know.", author: "Anonymous", x: 221, y: 860, rotation: -5, color: "yellow", drawing: ["M25 185 Q70 155 110 181 T205 175", "M180 30 L184 43 L197 47 L184 51 L180 64 L176 51 L163 47 L176 43 Z"] },
  { id: 17, kind: "polaroid", text: "We did it, together", author: "'22", x: 485, y: 857, rotation: 5, image: graduationPhoto },
  { id: 18, kind: "torn", text: "To old friends and new beginnings. There's always room for one more story.", author: "Cam '11", x: 773, y: 864, rotation: -4 },
  { id: 19, kind: "sticky", text: "Still have my school ID tucked in a drawer. Some things you just keep.", author: "Leah '13", x: 1033, y: 851, rotation: 5, color: "pink" },
  { id: 20, kind: "card", text: "BALIK BALENO,\nALWAYS HOME", author: "Founded 1992", x: 1242, y: 837, rotation: -6, color: "green" },
];

const newsItems = [
  { tag: "COMMUNITY", date: "JUNE 12, 2025", title: "A little piece of home, wherever you are", description: "Introducing a new space for all the stories that made us who we are.", image: campusPhoto },
  { tag: "ALUMNI STORIES", date: "JUNE 08, 2025", title: "The people who made the halls feel like home", description: "Meet the familiar faces making a difference beyond our school gates.", image: ivyPhoto },
  { tag: "SCHOOL UPDATE", date: "MAY 28, 2025", title: "The old courtyard gets a new chapter", description: "A beloved gathering place is getting a little love this summer.", image: graduationPhoto },
];

const events = [
  { month: "JUL", day: "26", category: "REUNION", title: "Class of 2016: Back where it began", detail: "Saturday · 4:00 PM · School Courtyard", description: "The inside jokes, the familiar faces, and probably a lot of photos. Come as you are." },
  { month: "AUG", day: "09", category: "COMMUNITY", title: "Summer alumni picnic", detail: "Saturday · 11:00 AM · Riverside Park", description: "Bring a blanket, bring a friend, and stay for the stories." },
  { month: "SEP", day: "14", category: "SCHOOL EVENT", title: "Homecoming & open doors", detail: "Sunday · 2:00 PM · Main Campus", description: "Walk the old halls and make some new memories together." },
];

function Icon({ name, size = 18, strokeWidth = 1.8 }: { name: string; size?: number; strokeWidth?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  const paths: Record<string, React.ReactNode> = {
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    arrowLeft: <><path d="M19 12H5m6 6-6-6 6-6" /></>,
    chevronLeft: <path d="m15 18-6-6 6-6" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    close: <path d="M18 6 6 18M6 6l12 12" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
    smile: <><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></>,
    spark: <path d="m12 2 1.8 7.2L21 11l-7.2 1.8L12 20l-1.8-7.2L3 11l7.2-1.8L12 2ZM19 18v4M17 20h4" />,
    flag: <><path d="M5 21V4m0 1c5-4 9 4 15 0v11c-6 4-10-4-15 0" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    pin: <><path d="m16 3 5 5-3 1-3 5-4 1-2 6-2-2 6-6 1-4 5-3 1-3ZM3 21l6-6" /></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8" cy="8" r="1" /><path d="m21 16-5-5L5 21" /></>,
    pen: <><path d="m14 5 5 5M4 20l4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z" /></>,
    upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 17v4h16v-4" /></>,
    hand: <><path d="M8 13V6a2 2 0 0 1 4 0v5-7a2 2 0 0 1 4 0v7-5a2 2 0 0 1 4 0v9c0 4-2.5 6-6 6h-3c-2 0-3-1-4-2l-4-5a2 2 0 0 1 3-3l2 2Z" /></>,
    check: <path d="m4 12 5 5L20 6" />,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function Logo({ onClick, light = false }: { onClick: () => void; light?: boolean }) {
  return <button className={`brand ${light ? "brand-light" : ""}`} onClick={onClick} aria-label="Balik Baleno home"><img className="brand-logo" src="/baleno-national-high-school-logo.jpg" alt="" /><span className="brand-text"><strong>Balik Baleno</strong><small>Where we always belong</small></span></button>;
}

function NoteCard({ note, compact = false, onClick, style, onPointerDown }: { note: Note; compact?: boolean; onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void; style?: React.CSSProperties; onPointerDown?: (event: ReactPointerEvent<HTMLButtonElement>) => void }) {
  return <button type="button" className={`note note-${note.kind} ${note.color ? `note-${note.color}` : ""} ${note.font === "serif" ? "note-font-serif" : ""} ${compact ? "note-compact" : ""}`} style={{ ...style, color: note.ink }} onClick={onClick} onPointerDown={onPointerDown} aria-label={`Note from ${note.author || "an alum"}: ${note.text}`}>
    <span className="pushpin" aria-hidden="true" />
    {note.kind === "polaroid" && <span className="note-photo"><img src={note.image || campusPhoto} alt="A memory from school" draggable={false} /></span>}
    <span className="note-copy">{note.text}</span>
    {note.author && <span className="note-author">— {note.author}</span>}
    {note.doodle && <span className="note-doodle">{note.doodle}</span>}
    {note.drawing && <svg className="note-drawing" viewBox="0 0 240 240" aria-hidden="true"><g fill="none" stroke={note.ink || "#020202"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{note.drawing.map((path, index) => <path d={path} key={index} />)}</g></svg>}
  </button>;
}

function WallBoard({ notes, onOpen, incomingId, interactive = true }: { notes: Note[]; onOpen: (note: Note) => void; incomingId?: number | null; interactive?: boolean }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(() => typeof window !== "undefined" && window.innerWidth < 700 ? 0.55 : 0.82);
  const [positions, setPositions] = useState<Record<number, { x: number; y: number }>>({});
  const pointerRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<{ id?: number; noteId?: number; startX: number; startY: number; originX: number; originY: number; moved: boolean; distance?: number; startScale?: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  function startPointer(event: ReactPointerEvent<HTMLDivElement>, noteId?: number) {
    if (!interactive || (event.target instanceof Element && event.target.closest(".wall-controls"))) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointerRef.current.size === 2) {
      const [a, b] = [...pointerRef.current.values()];
      gestureRef.current = { startX: 0, startY: 0, originX: 0, originY: 0, moved: true, distance: Math.hypot(a.x - b.x, a.y - b.y), startScale: scale };
    } else {
      const current = noteId ? positions[noteId] || notes.find(n => n.id === noteId) || { x: 0, y: 0 } : offset;
      gestureRef.current = { id: event.pointerId, noteId, startX: event.clientX, startY: event.clientY, originX: current.x, originY: current.y, moved: false };
    }
  }
  function movePointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (!interactive || !pointerRef.current.has(event.pointerId)) return;
    pointerRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const gesture = gestureRef.current;
    if (!gesture) return;
    if (pointerRef.current.size >= 2 && gesture.distance && gesture.startScale) {
      const [a, b] = [...pointerRef.current.values()];
      setScale(Math.max(0.4, Math.min(1.6, gesture.startScale * Math.hypot(a.x - b.x, a.y - b.y) / gesture.distance)));
    } else if (gesture.id === event.pointerId) {
      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;
      if (Math.hypot(dx, dy) > 5) gesture.moved = true;
      if (!gesture.moved) return;
      if (gesture.noteId) setPositions(previous => ({ ...previous, [gesture.noteId!]: { x: gesture.originX + dx / scale, y: gesture.originY + dy / scale } }));
      else setOffset({ x: gesture.originX + dx, y: gesture.originY + dy });
    }
  }
  function endPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (!interactive) return;
    const gesture = gestureRef.current;
    if (gesture?.id === event.pointerId && gesture.noteId && !gesture.moved) {
      const note = notes.find(n => n.id === gesture.noteId);
      if (note) onOpen(note);
    }
    pointerRef.current.delete(event.pointerId);
    gestureRef.current = null;
  }
  return <div className={`wall-viewport ${interactive ? "wall-interactive" : ""}`} ref={viewportRef} onPointerDown={e => { const button = (e.target as HTMLElement).closest("[data-note-id]"); startPointer(e, button ? Number(button.getAttribute("data-note-id")) : undefined); }} onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={endPointer}>
    <div className="wall-canvas" style={{ transform: `translate(calc(-50% + ${offset.x}px), ${offset.y}px) scale(${scale})` }}>
      <div className="wall-scrawl wall-scrawl-one">leave a little of yourself here ♡</div><div className="wall-scrawl wall-scrawl-two">FOUNDED 1992</div>
      {notes.map(note => { const position = positions[note.id] || note; return <div data-note-id={note.id} className={`wall-note-position ${incomingId === note.id ? "is-new" : ""}`} key={note.id} style={{ left: position.x, top: position.y, transform: `rotate(${note.rotation}deg)` }}><NoteCard note={note} onClick={event => { if (event.detail === 0) onOpen(note); }} /></div>; })}
    </div>
    {interactive && <div className="wall-controls"><span><Icon name="hand" size={16} /> Drag to explore</span><div className="zoom-buttons"><button aria-label="Zoom out" onClick={() => setScale(s => Math.max(.4, +(s - .15).toFixed(2)))}><Icon name="minus" size={17} /></button><span>{Math.round(scale * 100)}%</span><button aria-label="Zoom in" onClick={() => setScale(s => Math.min(1.6, +(s + .15).toFixed(2)))}><Icon name="plus" size={17} /></button></div></div>}
  </div>;
}

function SectionHeading({ eyebrow, title, description, action, onAction }: { eyebrow: string; title: string; description?: string; action?: string; onAction?: () => void }) {
  return <div className="section-heading"><div><span className="eyebrow"><span className="eyebrow-line" />{eyebrow}</span><h2>{title}</h2>{description && <p>{description}</p>}</div>{action && <button className="text-link" onClick={onAction}>{action} <Icon name="arrow" size={18} /></button>}</div>;
}

function Home({ go, openNote, notes }: { go: (page: Page) => void; openNote: (note: Note) => void; notes: Note[] }) {
  const previewNotes = [notes[0], notes[2], notes[3], notes[5], notes[6], notes[7], notes[9], notes[12]];
  return <>
    <section className="hero"><div className="hero-content"><div className="hero-kicker"><span className="live-dot" /> A PLACE FOR EVERY VERSION OF US</div><h1>Some things<br />stay <em>with us.</em></h1><p className="hero-description">The old halls. The familiar faces. The stories we still tell. Welcome to the little corner of the internet that feels like coming home.</p><div className="hero-actions"><button className="button button-primary" onClick={() => go("create")}><Icon name="pin" size={19} /> Pin a note <Icon name="arrow" size={17} /></button><button className="button button-outline" onClick={() => go("wall")}>Explore the wall <Icon name="arrow" size={17} /></button></div><div className="hero-bottom"><div className="avatar-stack"><span>AM</span><span>JL</span><span>SK</span><span>RT</span></div><span>Good company, old and new.<br /><strong>1,240 alumni</strong> already here</span></div></div><div className="hero-visual"><div className="hero-visual-top"><span><span className="live-dot" /> TODAY'S FREEDOM WALL</span><span>NO. 0284</span></div><div className="hero-wall"><span className="wall-chalk">our stories live here</span>{previewNotes.map((note, index) => <div className={`preview-note preview-note-${index}`} key={note.id} style={{ transform: `rotate(${note.rotation}deg)` }}><NoteCard note={note} compact onClick={() => openNote(note)} /></div>)}</div><div className="hero-visual-bottom"><span><Icon name="clock" size={16} /> Wall resets in <strong>5h 12m</strong></span><button onClick={() => go("wall")}>See the full wall <Icon name="arrow" size={16} /></button></div></div></section>
    <div className="ticker"><div className="ticker-inner"><span>YOUR STORIES</span><i>✳</i><span>YOUR PEOPLE</span><i>✳</i><span>YOUR PLACE</span><i>✳</i><span>BALIK BALENO</span><i>✳</i><span>YOUR STORIES</span><i>✳</i><span>YOUR PEOPLE</span></div></div>
    <section className="intro-section content-width"><div className="intro-side"><span className="small-star">✳</span><span>BALIK BALENO<br />WHERE WE ALWAYS BELONG</span></div><div className="intro-copy">No matter how long it's been, <em>you still belong here.</em><p>A space to leave a note, find an old friend, celebrate a win, or simply remember what it felt like to be here together.</p></div></section>
    <section className="home-section news-section content-width"><SectionHeading eyebrow="THE LATEST" title="Notes from around here" description="A little news from the place that started it all." action="All news" onAction={() => go("news")} /><div className="news-grid">{newsItems.map((item, index) => <button className="news-card" onClick={() => go("news")} key={item.title}><div className="news-card-image"><img src={item.image} alt="School and alumni memories" /><span className="image-index">0{index + 1} / 03</span></div><div className="news-meta"><span>{item.tag}</span><span>{item.date}</span></div><h3>{item.title}</h3><span className="card-link">Read the story <Icon name="arrow" size={17} /></span></button>)}</div></section>
    <section className="events-band"><div className="content-width"><SectionHeading eyebrow="SAVE THE DATE" title="See you there?" description="The best stories are the ones we make together." action="All events" onAction={() => go("events")} /><div className="event-row">{events.slice(0, 2).map(event => <div className="event-mini" key={event.title}><div className="event-date"><span>{event.month}</span><strong>{event.day}</strong></div><div><span className="event-label">{event.category}</span><h3>{event.title}</h3><p>{event.detail}</p></div><button aria-label={`View ${event.title}`} onClick={() => go("events")}><Icon name="arrow" size={20} /></button></div>)}</div></div></section>
    <section className="home-section batch-section content-width"><div className="batch-copy"><span className="eyebrow"><span className="eyebrow-line" /> OLD CLASSMATES, NEW CHAPTERS</span><h2>Find your <em>people.</em></h2><p>Some friendships pick up right where you left off. Find your graduating class and see who's here.</p><button className="button button-primary" onClick={() => go("batches")}>Explore all batches <Icon name="arrow" size={18} /></button></div><div className="batch-year-card"><div className="batch-year-top"><span>CLASS OF...</span><Icon name="spark" size={19} /></div><div className="year-grid">{[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013].map(year => <button key={year} onClick={() => go("batch")}>{year}</button>)}</div><div className="batch-year-foot">Your year is waiting for you. <span>↗</span></div></div></section>
    <section className="fame-section"><div className="content-width fame-inner"><div className="fame-image"><img src={graduationPhoto} alt="Graduates celebrating together" /><span className="photo-tape" /></div><div className="fame-copy"><span className="eyebrow"><span className="eyebrow-line" /> WALL OF FAME</span><h2>Look how far<br />we've <em>come.</em></h2><p>Artists, everyday heroes, big dreamers, quiet changemakers. Here's to the people who started right here and went on to make their mark.</p><button className="text-link" onClick={() => go("news")}>Meet our alumni <Icon name="arrow" size={19} /></button></div></div></section>
    <section className="join-section content-width"><span className="join-decoration">✳</span><span className="eyebrow">THE DOOR'S ALWAYS OPEN</span><h2>Come on in.<br /><em>We've missed you.</em></h2><p>One community. A thousand stories. And plenty of room for yours.</p><button className="button button-cream" onClick={() => go("create")}>Leave your first note <Icon name="arrow" size={18} /></button><div className="join-stats"><span><strong>1,240</strong> alumni connected</span><span className="stats-divider" /><span><strong>3,800</strong> notes pinned</span></div></section>
  </>;
}

function WallPage({ notes, onOpen, go, incomingId }: { notes: Note[]; onOpen: (note: Note) => void; go: (page: Page) => void; incomingId: number | null }) {
  return <div className="wall-page"><div className="page-heading content-width wall-page-heading"><div><span className="eyebrow"><span className="eyebrow-line" /> A LITTLE BIT OF EVERYONE</span><h1>The Freedom <em>Wall.</em></h1><p>Little thoughts, big feelings, and everything in between. Grab a note and make yourself at home.</p></div><div className="wall-page-actions"><div className="wall-timer"><span className="live-dot" /> TODAY'S WALL <span className="timer-divider">/</span> RESETS IN 5H 12M</div><button className="button button-primary" onClick={() => go("create")}><Icon name="pin" size={18} /> Pin a note <Icon name="arrow" size={17} /></button></div></div><div className="wall-frame"><div className="wall-frame-top"><span>BALIK BALENO <span className="frame-star">✳</span> FREEDOM WALL</span><span>DRAG TO EXPLORE · TAP A NOTE TO READ</span></div><WallBoard notes={notes} onOpen={onOpen} incomingId={incomingId} /><div className="wall-frame-bottom"><span>EVERY NOTE HAS A STORY.</span><button onClick={() => go("archive")}>Explore past walls <Icon name="arrow" size={17} /></button></div></div></div>;
}

function CreatePage({ onPin, go }: { onPin: (note: Note) => void; go: (page: Page) => void }) {
  const [template, setTemplate] = useState<NoteKind>("sticky");
  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [ink, setInk] = useState("#020202");
  const [font, setFont] = useState<"hand" | "serif">("hand");
  const [sticker, setSticker] = useState("");
  const [image, setImage] = useState("");
  const [drawing, setDrawing] = useState(false);
  const [paths, setPaths] = useState<string[]>([]);
  const [pinning, setPinning] = useState(false);
  const drawingRef = useRef(false);
  const currentPath = useRef("");
  const fileRef = useRef<HTMLInputElement>(null);
  const templateNames: { id: NoteKind; name: string }[] = [{ id: "sticky", name: "Sticky note" }, { id: "torn", name: "Torn paper" }, { id: "notebook", name: "Notebook" }, { id: "polaroid", name: "Polaroid" }];
  function drawPoint(event: ReactPointerEvent<SVGSVGElement>, start = false) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.round((event.clientX - rect.left) / rect.width * 240);
    const y = Math.round((event.clientY - rect.top) / rect.height * 240);
    currentPath.current += `${start ? "M" : " L"}${x} ${y}`;
    setPaths(previous => [...previous.slice(0, -1), currentPath.current]);
  }
  function pinNote() {
    if ((!text.trim() && !image && paths.length === 0) || pinning) return;
    setPinning(true);
    const note: Note = { id: Date.now(), kind: template, text: text.trim() || (image ? "A little memory from me" : "A little something I made"), author: anonymous ? "Anonymous" : author.trim() || "A fellow alum", x: 520, y: 320, rotation: -4, image: image || undefined, doodle: sticker || undefined, drawing: paths.filter(Boolean), ink, font, color: template === "sticky" ? "yellow" : undefined };
    window.setTimeout(() => { onPin(note); go("wall"); }, 500);
  }
  return <main className="create-page content-width"><button className="back-link" onClick={() => go("wall")}><Icon name="arrowLeft" size={17} /> Back to the wall</button><div className="page-heading create-heading"><span className="eyebrow"><span className="eyebrow-line" /> MAKE YOUR MARK</span><h1>Leave a little <em>something.</em></h1><p>A memory, a doodle, a shout-out, a poem. There's no wrong way to be here.</p></div><div className="editor-layout"><div className="editor-panel"><div className="editor-panel-head"><span>01 / MAKE IT YOURS</span><Icon name="spark" size={19} /></div><div className="editor-field"><label>Pick your paper</label><div className="template-grid">{templateNames.map(item => <button key={item.id} className={`template-option ${template === item.id ? "selected" : ""}`} onClick={() => setTemplate(item.id)}><span className={`template-swatch note-${item.id}`} /><span>{item.name}</span></button>)}</div></div><div className="editor-field"><label htmlFor="note-text">What's on your mind?</label><textarea id="note-text" value={text} onChange={e => setText(e.target.value.slice(0, 220))} placeholder="It all started when..." rows={5} /><span className="character-count">{text.length} / 220 characters</span></div><div className="editor-field"><label>Make it feel like you</label><div className="editor-tools"><button className={font === "hand" ? "tool-active" : ""} onClick={() => setFont("hand")} title="Handwriting font"><span className="tool-hand">Aa</span> Handwritten</button><button className={font === "serif" ? "tool-active" : ""} onClick={() => setFont("serif")} title="Classic font"><span className="tool-serif">Aa</span> Classic</button><button className={drawing ? "tool-active" : ""} onClick={() => setDrawing(!drawing)}><Icon name="pen" size={16} /> Draw</button><button onClick={() => fileRef.current?.click()}><Icon name="upload" size={16} /> Photo</button><input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={e => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = () => { setImage(String(reader.result)); setTemplate("polaroid"); }; reader.readAsDataURL(file); } }} /></div><div className="ink-row"><span>Ink color</span>{["#020202", "#8B1E1A", "#010066", "#1B1A5F"].map(color => <button key={color} className={ink === color ? "ink-selected" : ""} style={{ backgroundColor: color }} onClick={() => setInk(color)} aria-label={`Use ${color} ink`} />)}</div><div className="sticker-row"><span>Little extras</span>{["♡", "✳", "✦", "☼", "✿"].map(item => <button key={item} className={sticker === item ? "sticker-selected" : ""} onClick={() => setSticker(sticker === item ? "" : item)} aria-label={`Add ${item} sticker`}>{item}</button>)}</div></div><div className="editor-field author-field"><label htmlFor="note-author">Signed by</label><input id="note-author" value={author} onChange={e => setAuthor(e.target.value)} placeholder="Your name & class year (optional)" disabled={anonymous} /><label className="toggle-label"><input type="checkbox" checked={anonymous} onChange={e => setAnonymous(e.target.checked)} /><span className="toggle-track" /> Post anonymously <span className="toggle-hint">— your secret's safe with us</span></label></div></div><div className="preview-panel"><div className="preview-panel-head"><span>02 / THE PREVIEW</span><span>THIS ONE'S ALL YOURS</span></div><div className="preview-stage"><div className="preview-stage-label">A LITTLE SPACE JUST FOR YOU <span>✳</span></div><div className={`editor-note note-${template} ${template === "sticky" ? "note-yellow" : ""} ${pinning ? "note-pinning" : ""}`}><span className="pushpin" />{template === "polaroid" && <div className="editor-photo">{image ? <img src={image} alt="Your uploaded memory" /> : <><Icon name="image" size={34} /><span>Add a photo<br />to your note</span></>}</div>}<div className={`editor-note-text ${font === "serif" ? "editor-serif" : ""}`} style={{ color: ink }}>{text || <span className="placeholder-text">Your story goes here...</span>}</div>{sticker && <span className="editor-sticker">{sticker}</span>}<span className="editor-note-author">— {anonymous ? "Anonymous" : author || "Your name"}</span>{drawing && <svg className="drawing-layer" viewBox="0 0 240 240" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); drawingRef.current = true; currentPath.current = ""; setPaths(previous => [...previous, ""]); drawPoint(e, true); }} onPointerMove={e => { if (drawingRef.current) drawPoint(e); }} onPointerUp={() => { drawingRef.current = false; }}><g fill="none" stroke={ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{paths.map((path, index) => <path d={path} key={index} />)}</g></svg>}{!drawing && paths.length > 0 && <svg className="drawing-display" viewBox="0 0 240 240"><g fill="none" stroke={ink} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{paths.map((path, index) => <path d={path} key={index} />)}</g></svg>}</div><div className="preview-stage-caption">{pinning ? "Your note is on its way to the wall..." : drawing ? "Draw directly on your note. Tap Draw again when done." : "Just like the real thing, but without the glue."}</div></div><div className="preview-submit"><p>Your note will appear on today's wall for everyone to see.</p><button className="button button-primary" disabled={pinning || (!text.trim() && !image && paths.length === 0)} onClick={pinNote}><Icon name="pin" size={19} /> {pinning ? "Pinning..." : "Pin it to the wall"} <Icon name="arrow" size={18} /></button></div></div></div></main>;
}

function ArchivePage({ go, openNote }: { go: (page: Page) => void; openNote: (note: Note) => void }) {
  const today = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const currentMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const [selected, setSelected] = useState(new Date(today.getFullYear(), today.getMonth(), Math.max(1, today.getDate() - 1)));
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const leadingDays = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const archivedNotes = initialNotes.filter((_, i) => (i + selected.getDate()) % 3 !== 0).slice(0, 13);
  return <main className="archive-page content-width"><div className="page-heading"><span className="eyebrow"><span className="eyebrow-line" /> YESTERDAY'S STORIES, KEPT CLOSE</span><h1>The <em>Archive.</em></h1><p>Every day has a story. Wander back through the walls that came before.</p></div><div className="archive-layout"><div className="calendar-card"><div className="calendar-card-top"><Icon name="calendar" size={19} /><span>CHOOSE A DAY</span></div><div className="calendar-header"><h2>{currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2><div><button aria-label="Previous month" onClick={() => setMonthOffset(n => n - 1)}><Icon name="chevronLeft" size={19} /></button><button aria-label="Next month" disabled={monthOffset >= 0} onClick={() => setMonthOffset(n => n + 1)}><Icon name="chevronRight" size={19} /></button></div></div><div className="calendar-grid">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => <span className="calendar-weekday" key={day}>{day}</span>)}{Array.from({ length: leadingDays }, (_, i) => <span key={`empty-${i}`} />)}{Array.from({ length: daysInMonth }, (_, i) => { const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1); const future = date >= new Date(today.getFullYear(), today.getMonth(), today.getDate()); return <button key={i} disabled={future} className={date.toDateString() === selected.toDateString() ? "selected-day" : ""} onClick={() => setSelected(date)}>{i + 1}{!future && <span />}</button>; })}</div><div className="calendar-foot"><span className="calendar-dot" /> Days with stories to tell</div></div><div className="archive-preview"><div className="archive-preview-head"><div><span className="eyebrow">A DAY TO REMEMBER</span><h2>{selected.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</h2><p>{archivedNotes.length} notes left on this wall</p></div><button className="text-link" onClick={() => go("wall")}>Today's wall <Icon name="arrow" size={17} /></button></div><div className="archive-wall">{archivedNotes.slice(0, 8).map(note => <div key={note.id} style={{ transform: `rotate(${note.rotation}deg)` }}><NoteCard note={note} compact onClick={() => openNote(note)} /></div>)}</div><p className="archive-caption">Some days are worth holding onto. <span>✳</span></p></div></div></main>;
}

function NewsPage({ go }: { go: (page: Page) => void }) { return <main className="listing-page content-width"><div className="page-heading"><span className="eyebrow"><span className="eyebrow-line" /> THE WORD AROUND HERE</span><h1>News & <em>stories.</em></h1><p>Good things happening, familiar faces doing wonderful things, and all the little updates in between.</p></div><div className="news-grid listing-grid">{newsItems.map((item, index) => <article className="news-card" key={item.title}><div className="news-card-image"><img src={item.image} alt="School and alumni memories" /><span className="image-index">0{index + 1} / 03</span></div><div className="news-meta"><span>{item.tag}</span><span>{item.date}</span></div><h3>{item.title}</h3><p>{item.description}</p></article>)}</div><div className="listing-bottom">Got a story worth sharing? <button className="text-link" onClick={() => go("create")}>Leave it on the wall <Icon name="arrow" size={18} /></button></div></main>; }

function EventsPage() {
  const [rsvps, setRsvps] = useState<number[]>([]);
  return <main className="listing-page content-width"><div className="page-heading"><span className="eyebrow"><span className="eyebrow-line" /> MAKE MORE MEMORIES</span><h1>Let's get <em>together.</em></h1><p>Reunions, little get-togethers, and reasons to see old friends again. Save yourself a spot.</p></div><div className="events-list">{events.map((event, index) => <article className="event-list-card" key={event.title}><div className="event-date"><span>{event.month}</span><strong>{event.day}</strong></div><div className="event-list-body"><span className="event-label">{event.category}</span><h2>{event.title}</h2><p className="event-detail"><Icon name="calendar" size={16} /> {event.detail}</p><p>{event.description}</p></div><button className={`button ${rsvps.includes(index) ? "button-confirmed" : "button-outline"}`} onClick={() => setRsvps(previous => previous.includes(index) ? previous.filter(i => i !== index) : [...previous, index])}>{rsvps.includes(index) ? <><Icon name="check" size={17} /> You're going</> : <>Count me in <Icon name="arrow" size={17} /></>}</button></article>)}</div><p className="events-disclaimer">RSVPs are just for this preview and aren't saved. We can't wait to see you there.</p></main>;
}

function BatchesPage({ go, selectYear }: { go: (page: Page) => void; selectYear: (year: number) => void }) { return <main className="listing-page content-width"><div className="page-heading"><span className="eyebrow"><span className="eyebrow-line" /> THE YEARS THAT MADE US</span><h1>Find your <em>batch.</em></h1><p>Different years, same place in our hearts. Find your people and pick up where you left off.</p></div><div className="batches-grid">{Array.from({ length: 30 }, (_, i) => 2025 - i).map((year, i) => <button key={year} onClick={() => { selectYear(year); go("batch"); }}><span>CLASS OF</span><strong>{year}</strong><span>{34 + (i * 13) % 51} classmates <Icon name="arrow" size={16} /></span></button>)}</div></main>; }

function BatchPage({ year, go }: { year: number; go: (page: Page) => void }) { return <main className="batch-page content-width"><button className="back-link" onClick={() => go("batches")}><Icon name="arrowLeft" size={17} /> All batches</button><div className="batch-hero"><div><span className="eyebrow">THE YEAR WE'LL NEVER FORGET</span><h1>Class of <em>{year}.</em></h1><p>Same old stories. A few new chapters. It's really good to see you again.</p><div className="batch-hero-stat"><span><strong>68</strong> classmates here</span><span><strong>124</strong> memories shared</span></div></div><div className="batch-hero-photo"><img src={graduationPhoto} alt="Graduates celebrating together" /><span>the good old days ↗</span></div></div><section className="batch-members"><SectionHeading eyebrow="FAMILIAR FACES" title="Look who's here" description="The names you know, the people you missed." /><div className="member-grid">{["Alex Morgan", "Jamie Lee", "Samira Khan", "Riley Torres", "Maya Chen", "Jordan Cruz", "Taylor Kim", "Casey Rivera"].map((name, index) => <div className="member-card" key={name}><span className={`member-avatar member-avatar-${index % 4}`}>{name.split(" ").map(n => n[0]).join("")}</span><div><strong>{name}</strong><small>Class of {year}</small></div></div>)}</div></section><div className="batch-cta"><span>Missing someone?</span><p>Leave a note on the wall and let them know you're thinking of them.</p><button className="button button-primary" onClick={() => go("create")}>Pin a note <Icon name="arrow" size={18} /></button></div></main>; }

function Lightbox({ note, notes, onClose, onSelect }: { note: Note; notes: Note[]; onClose: () => void; onSelect: (note: Note) => void }) {
  const [reacted, setReacted] = useState<Record<string, boolean>>({});
  const [reported, setReported] = useState(false);
  const index = notes.findIndex(n => n.id === note.id);
  useEffect(() => { function keyDown(event: KeyboardEvent) { if (event.key === "Escape") onClose(); if (event.key === "ArrowRight") onSelect(notes[(index + 1) % notes.length]); if (event.key === "ArrowLeft") onSelect(notes[(index - 1 + notes.length) % notes.length]); } window.addEventListener("keydown", keyDown); return () => window.removeEventListener("keydown", keyDown); }, [index, notes, onClose, onSelect]);
  return <div className="lightbox-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}><div className="lightbox" role="dialog" aria-modal="true" aria-label="Read a note"><div className="lightbox-top"><span>FROM THE FREEDOM WALL <span>✳</span> NOTE {String(index + 1).padStart(2, "0")}/{String(notes.length).padStart(2, "0")}</span><button onClick={onClose} aria-label="Close note"><Icon name="close" size={22} /></button></div><div className="lightbox-main"><button className="lightbox-nav" aria-label="Previous note" onClick={() => { onSelect(notes[(index - 1 + notes.length) % notes.length]); setReported(false); }}><Icon name="chevronLeft" size={25} /></button><div className="lightbox-paper"><NoteCard note={note} /></div><button className="lightbox-nav" aria-label="Next note" onClick={() => { onSelect(notes[(index + 1) % notes.length]); setReported(false); }}><Icon name="chevronRight" size={25} /></button></div><div className="lightbox-bottom"><div className="reaction-buttons">{[{ name: "heart", label: "Love", count: 24 }, { name: "smile", label: "Relate", count: 12 }, { name: "spark", label: "Nostalgia", count: 8 }].map(reaction => { const key = `${note.id}-${reaction.label}`; return <button key={key} className={reacted[key] ? "reacted" : ""} onClick={() => setReacted(previous => ({ ...previous, [key]: !previous[key] }))}><Icon name={reaction.name} size={17} /> {reaction.label} <span>{reaction.count + (reacted[key] ? 1 : 0)}</span></button>; })}</div><button className="report-button" onClick={() => setReported(true)}><Icon name="flag" size={16} /> {reported ? "Reported · thank you" : "Report"}</button></div></div></div>;
}

function App() {
  const getPage = (): Page => { const hash = window.location.hash.slice(1) as Page; return ["wall", "create", "archive", "news", "events", "batches", "batch"].includes(hash) ? hash : "home"; };
  const [page, setPage] = useState<Page>(getPage);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [batchYear, setBatchYear] = useState(2016);
  const [incomingId, setIncomingId] = useState<number | null>(null);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  useEffect(() => { const listener = () => setPage(getPage()); window.addEventListener("hashchange", listener); return () => window.removeEventListener("hashchange", listener); }, []);
  useEffect(() => {
    let lastY = window.scrollY;
    function handleScroll() {
      const currentY = window.scrollY;
      setHeaderScrolled(currentY > 18);
      setHeaderHidden(currentY > lastY && currentY > 110 && !menuOpen);
      lastY = currentY;
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [menuOpen]);
  function go(next: Page) { window.location.hash = next === "home" ? "" : next; setPage(next); setMenuOpen(false); setSelectedNote(null); window.scrollTo({ top: 0, behavior: "instant" }); }
  const navItems: { label: string; page: Page }[] = [{ label: "The Wall", page: "wall" }, { label: "News", page: "news" }, { label: "Events", page: "events" }, { label: "Batches", page: "batches" }, { label: "Archive", page: "archive" }];
  return <div className="app-shell"><div className="announcement"><span>✳</span> A PLACE FOR THE STORIES THAT STAY WITH US <span>✳</span></div><header className={`site-header ${headerScrolled ? "header-scrolled" : ""} ${headerHidden ? "header-hidden" : ""}`}><div className="header-inner content-width"><Logo onClick={() => go("home")} /><nav className={menuOpen ? "nav-open" : ""} aria-label="Main navigation">{navItems.map(item => <button key={item.page} className={page === item.page ? "nav-active" : ""} onClick={() => go(item.page)}>{item.label}</button>)}<button className="mobile-join" onClick={() => go("create")}>Join the room <Icon name="arrow" size={17} /></button></nav><button className="header-join" onClick={() => go("create")}>Join the room <Icon name="arrow" size={16} /></button><button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"}><Icon name={menuOpen ? "close" : "menu"} size={25} /></button></div></header>
    {page === "home" && <Home go={go} openNote={setSelectedNote} notes={notes} />}
    {page === "wall" && <WallPage notes={notes} onOpen={setSelectedNote} go={go} incomingId={incomingId} />}
    {page === "create" && <CreatePage onPin={note => { setNotes(previous => [note, ...previous]); setIncomingId(note.id); }} go={go} />}
    {page === "archive" && <ArchivePage go={go} openNote={setSelectedNote} />}
    {page === "news" && <NewsPage go={go} />}
    {page === "events" && <EventsPage />}
    {page === "batches" && <BatchesPage go={go} selectYear={setBatchYear} />}
    {page === "batch" && <BatchPage year={batchYear} go={go} />}
    <footer className="site-footer"><div className="content-width"><div className="footer-main"><div className="footer-about"><Logo onClick={() => go("home")} light /><p>For every story that started here,<br />and every one still being written.</p></div><div className="footer-links"><div><span>EXPLORE</span><button onClick={() => go("wall")}>Freedom Wall</button><button onClick={() => go("news")}>News & stories</button><button onClick={() => go("events")}>Events</button></div><div><span>FIND YOUR WAY</span><button onClick={() => go("batches")}>Your batch</button><button onClick={() => go("archive")}>The archive</button><button onClick={() => go("create")}>Leave a note</button></div></div><div className="footer-signoff">Balik Baleno.<br /><em>Where we always belong.</em><span>✳</span></div></div><p className="footer-disclaimer">An independent alumni project, not affiliated with or endorsed by Baleno National High School.</p><div className="footer-bottom"><span>© {new Date().getFullYear()} Balik Baleno.</span><span>Baleno National High School <span className="footer-bottom-star">·</span> Founded 1992</span></div></div></footer>
    {selectedNote && <Lightbox note={selectedNote} notes={notes.some(note => note.id === selectedNote.id) ? notes : initialNotes} onSelect={setSelectedNote} onClose={() => setSelectedNote(null)} />}
  </div>;
}

export default App;
