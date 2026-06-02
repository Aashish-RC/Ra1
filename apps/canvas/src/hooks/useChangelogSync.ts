import { useEffect, useRef } from 'react'
import { useModelStore } from '../store/model.store'
import type { ChangelogEntry } from '../store/model.store'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const POLL_INTERVAL = 5 * 60 * 1000 // 5 minutes

interface ChangelogResponse {
  hasChanges: boolean
  changes: Record<string, ChangelogEntry[]>
  lastChecked: string
}

export function useChangelogSync() {
  const setPendingChanges = useModelStore(s => s.setPendingChanges)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const fetchChangelog = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/models/changelog`, {
          signal: AbortSignal.timeout(10000),
        })
        if (!res.ok) return
        const data = (await res.json()) as ChangelogResponse
        setPendingChanges(data)
      } catch {
        // Silently fail — next poll will retry
      }
    }

    // Fetch immediately on mount
    fetchChangelog()

    // Then poll every 5 minutes
    intervalRef.current = setInterval(fetchChangelog, POLL_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [setPendingChanges])
}