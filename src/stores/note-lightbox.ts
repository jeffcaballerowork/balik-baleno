import { atom } from "nanostores"

import type { Note } from "../data/mock"

export interface NoteLightboxState {
  note: Note | null

  notes: Note[]
}

export const noteLightbox = atom<NoteLightboxState>({
  note: null,

  notes: [],
})
