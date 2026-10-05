import { z } from "zod"

const manilaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",

  year: "numeric",

  month: "2-digit",

  day: "2-digit",
})

export const wallDateSchema = z

  .string()

  .regex(/^\d{4}-\d{2}-\d{2}$/)

  .refine((value) => {
    const timestamp = Date.parse(`${value}T00:00:00.000Z`)

    return (
      Number.isFinite(timestamp) &&
      new Date(timestamp).toISOString().slice(0, 10) === value
    )
  })

export function getManilaDate(now = new Date()): string {
  const parts = manilaDateFormatter.formatToParts(now)

  const part = (type: Intl.DateTimeFormatPartTypes): string => {
    const value = parts.find((item) => item.type === type)?.value

    if (!value) {
      throw new Error(`Unable to determine Manila date ${type}.`)
    }

    return value
  }

  return `${part("year").padStart(4, "0")}-${part("month")}-${part("day")}`
}

export function getWallResetAt(wallDate: string): string {
  const nextDayUtc = new Date(`${wallDate}T00:00:00.000Z`)

  nextDayUtc.setUTCDate(nextDayUtc.getUTCDate() + 1)

  return new Date(nextDayUtc.getTime() - 8 * 60 * 60 * 1000).toISOString()
}
