import { env } from "cloudflare:workers"

export async function updateBirthday(
  userId: string,
  birthMonth: number | null,
  birthDay: number | null,
  birthdayVisible: number,
): Promise<void> {
  await env.DB.prepare(
    `UPDATE users
     SET birth_month = ?, birth_day = ?, birthday_visible = ?, updated_at = datetime('now')
     WHERE id = ?`,
  )
    .bind(birthMonth, birthDay, birthdayVisible, userId)
    .run()
}