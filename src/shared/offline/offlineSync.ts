import NetInfo, { type NetInfoState } from "@react-native-community/netinfo"
import { api, isNetworkError, type User } from "../../api"
import type { AttendanceLog } from "../../features/attendance/attendance.types"
import {
  clearAttendanceQueue,
  getAttendanceQueue,
  getCachedBranches,
  getCachedTodayAttendance,
  persistCachedUser,
  removeFromAttendanceQueue,
  saveCachedAttendanceHistory,
  saveCachedBranches,
  saveCachedTodayAttendance,
  type CachedBranch,
  type QueuedAttendance
} from "./offlineStorage"

type SyncListener = (event: {
  type: "sync_start" | "sync_complete" | "sync_error" | "connectivity_change"
  queueCount: number
  isOnline: boolean
  message?: string
}) => void

const listeners = new Set<SyncListener>()

export function subscribeToSyncEvents(listener: SyncListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notifyListeners(event: Parameters<SyncListener>[0]) {
  listeners.forEach((listener) => {
    try {
      listener(event)
    } catch (e) {
      console.warn("Error in sync listener:", e)
    }
  })
}

let isSyncing = false

/**
 * Checks if device currently has network connectivity.
 */
export async function checkIsOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch()
    return Boolean(state.isConnected && state.isInternetReachable !== false)
  } catch {
    return false
  }
}

/**
 * Syncs essential data needed for offline mode every time app opens or reconnects.
 * Downloads:
 * - Active branch locations (for geofencing)
 * - User profile
 * - Today's attendance record
 * - Attendance history
 */
export async function syncOfflineEssentialData(): Promise<void> {
  const online = await checkIsOnline()
  if (!online) return

  try {
    // 1. Branches for location verification
    const branches = await api.get<CachedBranch[]>("/branches", 10000).catch(() => null)
    if (branches && Array.isArray(branches)) {
      await saveCachedBranches(branches)
    }

    // 2. Today's attendance
    const today = await api
      .get<AttendanceLog | null>("/attendance/me/today", 10000)
      .catch(() => undefined)
    if (today !== undefined) {
      await saveCachedTodayAttendance(today)
    }

    // 3. Current user profile
    const userRes = await api
      .get<User | { user: User }>("/auth/me", 10000)
      .catch(() => null)
    if (userRes) {
      const user = "user" in userRes ? userRes.user : userRes
      await persistCachedUser(user)
    }

    // 4. Attendance history
    const history = await api.get<unknown>("/attendance/me", 10000).catch(() => null)
    if (history) {
      await saveCachedAttendanceHistory(history)
    }
  } catch (err) {
    console.warn("Could not sync offline essential data:", err)
  }
}

/**
 * Syncs pending offline attendance queue to the backend.
 * Called automatically when internet connection restores.
 */
export async function syncPendingAttendance(): Promise<{
  synced: number
  failed: number
  remaining: number
}> {
  if (isSyncing) {
    const queue = await getAttendanceQueue()
    return { synced: 0, failed: 0, remaining: queue.length }
  }

  const online = await checkIsOnline()
  if (!online) {
    const queue = await getAttendanceQueue()
    return { synced: 0, failed: 0, remaining: queue.length }
  }

  isSyncing = true
  const initialQueue = await getAttendanceQueue()

  if (initialQueue.length === 0) {
    isSyncing = false
    return { synced: 0, failed: 0, remaining: 0 }
  }

  notifyListeners({
    type: "sync_start",
    queueCount: initialQueue.length,
    isOnline: true,
    message: `Syncing ${initialQueue.length} offline attendance records...`
  })

  // Sort chronologically so clock-ins precede clock-outs
  const sortedQueue = [...initialQueue].sort(
    (a, b) => +new Date(a.occurredAt) - +new Date(b.occurredAt)
  )

  let syncedCount = 0
  let failedCount = 0

  for (const item of sortedQueue) {
    try {
      const endpoint =
        item.action === "IN" ? "/attendance/clock-in" : "/attendance/clock-out"

      await api.post(
        endpoint,
        {
          ...(item.latitude !== null && item.latitude !== undefined
            ? { latitude: item.latitude }
            : {}),
          ...(item.longitude !== null && item.longitude !== undefined
            ? { longitude: item.longitude }
            : {}),
          ...(item.locationFailureReason
            ? { locationFailureReason: item.locationFailureReason }
            : {}),
          occurredAt: item.occurredAt
        },
        15000
      )

      await removeFromAttendanceQueue(item.id)
      syncedCount++
    } catch (error: any) {
      if (isNetworkError(error) || (typeof error?.status === "number" && error.status >= 500)) {
        // Network went down mid-sync or server is temporarily unavailable. Keep item in queue for next retry.
        console.warn(`Attendance sync transient failure for ${item.id}:`, error)
        failedCount++
        break
      }

      // If backend reports already clocked in or replay, treat as synced
      const message = String(error?.message || "").toLowerCase()
      const code = String(error?.code || "")

      if (
        code === "ALREADY_CLOCKED_IN" ||
        message.includes("already attendance mark") ||
        message.includes("already clocked in")
      ) {
        await removeFromAttendanceQueue(item.id)
        syncedCount++
      } else {
        // Unexpected server-side rejection (e.g. invalid date older than 14 days).
        // Remove so bad records don't poison queue indefinitely.
        console.warn(`Attendance sync rejected for ${item.id}:`, error)
        await removeFromAttendanceQueue(item.id)
        failedCount++
      }
    }
  }

  // Refresh today's attendance from authoritative server state
  try {
    const updatedToday = await api.get<AttendanceLog | null>(
      "/attendance/me/today",
      10000
    )
    await saveCachedTodayAttendance(updatedToday ?? null)
  } catch {
    // Non-critical if fetch fails
  }

  const remainingQueue = await getAttendanceQueue()
  isSyncing = false

  notifyListeners({
    type: "sync_complete",
    queueCount: remainingQueue.length,
    isOnline: true,
    message:
      syncedCount > 0
        ? `Successfully synced ${syncedCount} attendance record${syncedCount > 1 ? "s" : ""}.`
        : undefined
  })

  return {
    synced: syncedCount,
    failed: failedCount,
    remaining: remainingQueue.length
  }
}

/**
 * Initializes continuous network listener that triggers auto-sync
 * as soon as network is restored.
 */
export function initNetworkSyncListener(
  onStatusChange?: (isOnline: boolean) => void
): () => void {
  let wasOffline = false

  const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    const isOnline = Boolean(
      state.isConnected && state.isInternetReachable !== false
    )

    onStatusChange?.(isOnline)
    notifyListeners({
      type: "connectivity_change",
      queueCount: 0,
      isOnline
    })

    if (isOnline && wasOffline) {
      // Internet just recovered! Auto-sync pending attendance and fresh data.
      void (async () => {
        await syncPendingAttendance()
        await syncOfflineEssentialData()
      })()
    }

    wasOffline = !isOnline
  })

  return unsubscribe
}
