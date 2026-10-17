/**
 * The batch directory's arithmetic, pure on purpose. The point of this function
 * is that the two numbers a batch page shows can never be flattering by
 * accident: a member who hid is not in the member count, and a hidden note is
 * not in the note count. Zeros stay zeros rather than becoming a plausible
 * number. The D1 side lives in `batch-db.ts`.
 */

export interface BatchMemberRow {
  listed_in_batch: number
}

export interface BatchNoteRow {
  hidden: number
}

export interface BatchSummary {
  members: number
  notes: number
}

export function summariseBatch(rows: { members: BatchMemberRow[]; notes: BatchNoteRow[] }): BatchSummary {
  return {
    members: rows.members.filter(member => member.listed_in_batch === 1).length,
    notes: rows.notes.filter(note => note.hidden === 0).length,
  }
}
