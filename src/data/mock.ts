// MOCK, replace before public launch

export type NoteKind = "sticky" | "torn" | "notebook" | "polaroid" | "card"

export type ReactionKind = "love" | "relate" | "nostalgia"

export type NoteReactionCounts = Record<ReactionKind, number>

export type NoteReactionState = Record<ReactionKind, boolean>

export const mockReactionCounts: NoteReactionCounts = {
  love: 24,
  relate: 12,
  nostalgia: 8,
}

export interface Note {
  id: string | number

  kind: NoteKind

  text: string

  author: string

  x: number

  y: number

  rotation: number

  color?: string

  image?: string

  doodle?: string

  drawing?: string[]

  ink?: string

  font?: "hand" | "serif"

  zIndex?: number

  reactionCounts?: NoteReactionCounts

  myReactions?: NoteReactionState
}

export const campusPhoto =
  "https://images.unsplash.com/photo-1567878874047-4ee47c135328?w=900&q=85"

export const graduationPhoto =
  "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=900&q=85"

export const ivyPhoto =
  "https://images.unsplash.com/photo-1699152865865-a7d89bb16bf8?w=900&q=85"

export const homeMock = {
  alumniCount: "1,240",

  noteCount: "3,800",

  wallNumber: "0284",

  resetsIn: "5h 12m",

  previewAvatarInitials: ["AM", "JL", "SK", "RT"],
}

export const initialNotes: Note[] = [
  {
    id: 1,
    kind: "sticky",
    text: "To whoever needs to hear it: you are doing better than you think. ♡",
    author: "a friend from '18",
    x: 76,
    y: 78,
    rotation: -6,
    color: "yellow",
  },

  {
    id: 2,
    kind: "torn",
    text: "The bell still rings somewhere in my dreams. And somehow, we're all still running late.",
    author: "Mara, '15",
    x: 328,
    y: 57,
    rotation: 4,
  },

  {
    id: 3,
    kind: "polaroid",
    text: "The place where it all began",
    author: "Class of '19",
    x: 610,
    y: 71,
    rotation: -5,
    image: campusPhoto,
  },

  {
    id: 4,
    kind: "sticky",
    text: "Anyone remember the canteen's legendary cheese rolls?",
    author: "Nico '12",
    x: 889,
    y: 53,
    rotation: 6,
    color: "pink",
  },

  {
    id: 5,
    kind: "notebook",
    text: "Roses are red,\nOur uniforms were blue,\nNo matter how far,\nThis place stays with you.",
    author: "Anonymous",
    x: 1130,
    y: 76,
    rotation: -3,
  },

  {
    id: 6,
    kind: "card",
    text: "CLASS OF '16\nREUNION!",
    author: "July 26 · The old courtyard",
    x: 121,
    y: 333,
    rotation: 5,
    color: "green",
  },

  {
    id: 7,
    kind: "sticky",
    text: "Shout-out to Ms. Rivera for believing in the quiet kids.",
    author: "still grateful",
    x: 371,
    y: 324,
    rotation: -4,
    color: "blue",
  },

  {
    id: 8,
    kind: "torn",
    text: "We grew up. We went places. But a part of us is still at that lunch table.",
    author: "Jules '17",
    x: 641,
    y: 350,
    rotation: 6,
  },

  {
    id: 9,
    kind: "sticky",
    text: "Dear 17-year-old me: it works out. Keep going.",
    author: "you, ten years later",
    x: 952,
    y: 340,
    rotation: -7,
    color: "yellow",
  },

  {
    id: 10,
    kind: "polaroid",
    text: "Forever our favorite corner",
    author: "",
    x: 1175,
    y: 342,
    rotation: 7,
    image: ivyPhoto,
  },

  {
    id: 11,
    kind: "notebook",
    text: "The hallway was loud,\nbut the little moments\nwere everything.",
    author: "An old classmate",
    x: 49,
    y: 605,
    rotation: -3,
    doodle: "✳",
  },

  {
    id: 12,
    kind: "sticky",
    text: "Proud of everyone who made it through the hard days. You belong here.",
    author: "Sofia '21",
    x: 325,
    y: 617,
    rotation: 7,
    color: "pink",
  },

  {
    id: 13,
    kind: "card",
    text: "GOOD LUCK\nGRADUATES!",
    author: "The alumni family",
    x: 596,
    y: 619,
    rotation: -5,
    color: "mustard",
  },

  {
    id: 14,
    kind: "torn",
    text: "Found our old yearbook today. We really thought those haircuts were a good idea.",
    author: "Ben '14",
    x: 865,
    y: 610,
    rotation: 4,
  },

  {
    id: 15,
    kind: "sticky",
    text: "Let's make more memories, okay?",
    author: "Ari '20",
    x: 1134,
    y: 633,
    rotation: -5,
    color: "blue",
    doodle: "✿",
  },

  {
    id: 16,
    kind: "sticky",
    text: "The library steps at sunset. If you know, you know.",
    author: "Anonymous",
    x: 221,
    y: 860,
    rotation: -5,
    color: "yellow",
    drawing: [
      "M25 185 Q70 155 110 181 T205 175",
      "M180 30 L184 43 L197 47 L184 51 L180 64 L176 51 L163 47 L176 43 Z",
    ],
  },

  {
    id: 17,
    kind: "polaroid",
    text: "We did it, together",
    author: "'22",
    x: 485,
    y: 857,
    rotation: 5,
    image: graduationPhoto,
  },

  {
    id: 18,
    kind: "torn",
    text: "To old friends and new beginnings. There's always room for one more story.",
    author: "Cam '11",
    x: 773,
    y: 864,
    rotation: -4,
  },

  {
    id: 19,
    kind: "sticky",
    text: "Still have my school ID tucked in a drawer. Some things you just keep.",
    author: "Leah '13",
    x: 1033,
    y: 851,
    rotation: 5,
    color: "pink",
  },

  {
    id: 20,
    kind: "card",
    text: "BALIK BALENO,\nALWAYS HOME",
    author: "Founded 1992",
    x: 1242,
    y: 837,
    rotation: -6,
    color: "green",
  },
]

export const newsItems = [
  {
    tag: "COMMUNITY",
    date: "JUNE 12, 2025",
    title: "A little piece of home, wherever you are",
    description:
      "Introducing a new space for all the stories that made us who we are.",
    image: campusPhoto,
  },

  {
    tag: "ALUMNI STORIES",
    date: "JUNE 08, 2025",
    title: "The people who made the halls feel like home",
    description:
      "Meet the familiar faces making a difference beyond our school gates.",
    image: ivyPhoto,
  },

  {
    tag: "SCHOOL UPDATE",
    date: "MAY 28, 2025",
    title: "The old courtyard gets a new chapter",
    description:
      "A beloved gathering place is getting a little love this summer.",
    image: graduationPhoto,
  },
]

export const events = [
  {
    month: "JUL",
    day: "26",
    category: "REUNION",
    title: "Class of 2016: Back where it began",
    detail: "Saturday · 4:00 PM · School Courtyard",
    description:
      "The inside jokes, the familiar faces, and probably a lot of photos. Come as you are.",
  },

  {
    month: "AUG",
    day: "09",
    category: "COMMUNITY",
    title: "Summer alumni picnic",
    detail: "Saturday · 11:00 AM · Riverside Park",
    description: "Bring a blanket, bring a friend, and stay for the stories.",
  },

  {
    month: "SEP",
    day: "14",
    category: "SCHOOL EVENT",
    title: "Homecoming & open doors",
    detail: "Sunday · 2:00 PM · Main Campus",
    description: "Walk the old halls and make some new memories together.",
  },
]

export const homePreviewNotes = [
  initialNotes[0],

  initialNotes[2],

  initialNotes[3],

  initialNotes[5],

  initialNotes[6],

  initialNotes[7],

  initialNotes[9],

  initialNotes[12],
]
