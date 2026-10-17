/**
 * The rules of the interest vocabulary, pure on purpose: slugging a member's
 * suggestion, matching a type-ahead query, and enforcing the pick cap. The D1
 * side lives in `interests-db.ts` so this module stays unit testable.
 *
 * The catalogue is data, not code (see docs/specs/profile.md): an approved
 * suggestion becomes pickable without a deploy, and `active = 0` retires one
 * without breaking anybody who already picked it.
 */

export interface InterestOption {
  slug: string
  label: string
  group: string
  sort: number
}

/**
 * A stable slug for a hand-typed interest. Accents fold to their base letter
 * rather than being dropped, and anything that is not a letter or a digit
 * becomes a hyphen, so "Kansi & Batchoy" and "kansi and batchoy" cannot end up
 * as two different interests.
 */
export function slugify(text: string): string | null {
  const slug = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")

  return slug === "" ? null : slug
}

/**
 * Type-ahead. A blank query returns nothing at all rather than the whole
 * catalogue — the shelf already shows everything, and returning it here would
 * make "no search" and "no hits" indistinguishable.
 */
export function matchInterests(catalogue: InterestOption[], query: string): InterestOption[] {
  const needle = query.trim().toLowerCase()

  if (needle === "") return []

  return catalogue.filter(
    interest => interest.label.toLowerCase().includes(needle) || interest.slug.includes(needle),
  )
}

/**
 * Add or remove one pick. Past the cap it refuses the new pick rather than
 * dropping an earlier one, and it never duplicates.
 */
export function togglePick(picks: string[], slug: string, cap: number): string[] {
  if (picks.includes(slug)) return picks.filter(pick => pick !== slug)

  if (picks.length >= cap) return picks

  return [...picks, slug]
}
