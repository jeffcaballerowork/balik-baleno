import { useEffect, useState } from "react"

import { useStore } from "@nanostores/react"

import { formatWallCountdown } from "../lib/wall-client"

import { wallData } from "../stores/wall-data"

export default function WallCountdown() {
  const { resetsAt } = useStore(wallData)

  const [countdown, setCountdown] = useState("--")

  useEffect(() => {
    if (!resetsAt) return

    const resetAt = resetsAt
    let reloading = false

    function updateCountdown() {
      const remaining = Date.parse(resetAt) - Date.now()

      if (!Number.isFinite(remaining)) {
        console.error("The wall reset time is invalid.")

        return
      }

      if (remaining <= 0) {
        if (!reloading) {
          reloading = true

          window.location.reload()
        }

        return
      }

      setCountdown(formatWallCountdown(resetAt).toUpperCase())
    }

    updateCountdown()

    const interval = window.setInterval(updateCountdown, 60_000)

    return () => window.clearInterval(interval)
  }, [resetsAt])

  return <>RESETS IN {countdown}</>
}
