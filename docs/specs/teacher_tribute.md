# Teacher Tribute Corner

## Goal
Allow users to post thank-you notes to specific teachers.

## Data Model
- `teachers`
  - `id`: string (UUID)
  - `name`: string
  - `subject`: string (optional)
  - `created_at`: datetime
- `teacher_notes`
  - `id`: string (UUID)
  - `teacher_id`: string (FK to teachers)
  - `student_id`: string (FK to users)
  - `content`: text
  - `created_at`: datetime

## UI
- `/teachers`: List of teachers.
- `/teachers/[id]`: Page for a specific teacher with list of notes and form to add a note.

## API
- `GET /api/teachers`: Get list of teachers.
- `GET /api/teachers/[id]/notes`: Get notes for a teacher.
- `POST /api/teachers/[id]/notes`: Add a note.
