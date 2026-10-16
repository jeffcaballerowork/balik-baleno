export const TEACHER_PAGE_SIZE = 6

export interface TeacherLike {
  name: string
  subject: string | null
}

export function listSubjects(teachers: TeacherLike[]): string[] {
  const subjects = new Set<string>()

  for (const teacher of teachers) {
    const subject = teacher.subject?.trim()
    if (subject) subjects.add(subject)
  }

  return [...subjects].sort((a, b) => a.localeCompare(b))
}

export function filterTeachers<T extends TeacherLike>(teachers: T[], query: string, subject: string): T[] {
  const needle = query.trim().toLowerCase()

  return teachers.filter(teacher => {
    if (subject && teacher.subject !== subject) return false
    if (!needle) return true

    return teacher.name.toLowerCase().includes(needle) || (teacher.subject?.toLowerCase().includes(needle) ?? false)
  })
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number,
): { page: number; pageCount: number; items: T[] } {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount)
  const start = (current - 1) * pageSize

  return { page: current, pageCount, items: items.slice(start, start + pageSize) }
}
