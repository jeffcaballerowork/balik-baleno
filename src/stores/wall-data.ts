import { atom } from "nanostores"

export interface WallDataState {
  resetsAt: string | null
}

export const wallData = atom<WallDataState>({
  resetsAt: null,
})
