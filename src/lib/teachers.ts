import { env } from "cloudflare:workers"

export interface Teacher {
  id: string
  name: string
  subject: string | null
  created_at: string
}

export interface TeacherNote {
  id: string
  teacher_id: string
  student_id: string
  content: string
  created_at: string
  display_name: string // Joined from users table
}

export async function getAllTeachers(): Promise<Teacher[]> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM teachers ORDER BY name ASC`
  ).all<Teacher>()
  return results
}

export async function getTeacherById(id: string): Promise<Teacher | null> {
  const row = await env.DB.prepare(
    `SELECT * FROM teachers WHERE id = ?`
  ).bind(id).first<Teacher>()
  return row
}

export async function getNotesByTeacher(teacherId: string): Promise<TeacherNote[]> {
  const { results } = await env.DB.prepare(
    `SELECT n.*, u.display_name
     FROM teacher_notes n
     JOIN users u ON n.student_id = u.id
     WHERE n.teacher_id = ?
     ORDER BY n.created_at DESC`
  ).bind(teacherId).all<TeacherNote>()
  return results
}

export async function addTeacherNote(
  teacherId: string,
  studentId: string,
  content: string
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO teacher_notes (id, teacher_id, student_id, content)
     VALUES (lower(hex(randomblob(16))), ?, ?, ?)`
  ).bind(teacherId, studentId, content).run()
}
