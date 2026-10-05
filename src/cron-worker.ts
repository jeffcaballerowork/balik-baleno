import { getManilaDate } from "./lib/wall-date"

interface FinalizedWall {
  wall_date: string
  pin_count: number
  finalized_at: string
}

export default {
  async scheduled(
    controller: ScheduledController,
    env: ArchiveCronEnv,
  ): Promise<void> {
    const wallDate = getManilaDate(new Date(controller.scheduledTime - 1))
    const finalizedAt = new Date(controller.scheduledTime).toISOString()

    const finalized = await env.DB.prepare(
      `INSERT INTO walls (wall_date, pin_count, finalized_at)
       VALUES (
         ?,
         (SELECT COUNT(*) FROM pins WHERE wall_date = ? AND status = 'active'),
         ?
       )
       ON CONFLICT (wall_date) DO UPDATE SET
         pin_count = excluded.pin_count,
         finalized_at = excluded.finalized_at
       RETURNING wall_date, pin_count, finalized_at`,
    )
      .bind(wallDate, wallDate, finalizedAt)
      .first<FinalizedWall>()

    if (!finalized) {
      throw new Error(`Unable to finalize wall date ${wallDate}.`)
    }

    console.log(
      JSON.stringify({
        event: "wall_day_finalized",
        cron: controller.cron,
        wallDate: finalized.wall_date,
        pinCount: finalized.pin_count,
        finalizedAt: finalized.finalized_at,
      }),
    )
  },
} satisfies ExportedHandler<ArchiveCronEnv>
