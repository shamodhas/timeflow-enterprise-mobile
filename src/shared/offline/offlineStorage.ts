import * as SecureStore from "expo-secure-store"
import type { User } from "../../api"
import type { AttendanceLog } from "../../features/attendance/attendance.types"

export interface CachedBranch {
  id: string
  name: string
  latitude: number | string
  longitude: number | string
  radiusMeters: number
  isActive?: boolean
}

export interface QueuedAttendance {
  id: string
  action: "IN" | "OUT"
  occurredAt: string
  latitude?: number | null
  longitude?: number | null
  locationFailureReason?: string | null
  distanceMeters?: number | null
  locationVerified?: boolean
  branchId?: string | null
  branchName?: string | null
  createdAt: string
}

const STORAGE_KEYS = {
  USER: "timeflow_offline_user_profile",
  BRANCHES: "timeflow_offline_branches",
  TODAY_ATTENDANCE: "timeflow_offline_today_attendance",
  ATTENDANCE_HISTORY: "timeflow_offline_attendance_history",
  QUEUE: "timeflow_offline_attendance_queue"
} as const

// --- User Profile Caching ---

export async function persistCachedUser(user: User | null): Promise<void> {
  if (user) {
    await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(user))
  } else {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER)
  }
}

export async function getCachedUser(): Promise<User | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEYS.USER)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

// --- Branches (Geofences) Caching ---

export async function saveCachedBranches(branches: CachedBranch[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.BRANCHES, JSON.stringify(branches))
  } catch (err) {
    console.warn("Failed to cache branches offline:", err)
  }
}

export async function getCachedBranches(): Promise<CachedBranch[]> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEYS.BRANCHES)
    return raw ? (JSON.parse(raw) as CachedBranch[]) : []
  } catch {
    return []
  }
}

// --- Today's Attendance Caching ---

export async function saveCachedTodayAttendance(
  log: AttendanceLog | null
): Promise<void> {
  try {
    if (log) {
      await SecureStore.setItemAsync(
        STORAGE_KEYS.TODAY_ATTENDANCE,
        JSON.stringify(log)
      )
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.TODAY_ATTENDANCE)
    }
  } catch (err) {
    console.warn("Failed to cache today's attendance offline:", err)
  }
}

export async function getCachedTodayAttendance(): Promise<AttendanceLog | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEYS.TODAY_ATTENDANCE)
    return raw ? (JSON.parse(raw) as AttendanceLog) : null
  } catch {
    return null
  }
}

// --- Attendance History Caching ---

export async function saveCachedAttendanceHistory(data: unknown): Promise<void> {
  try {
    if (data) {
      await SecureStore.setItemAsync(
        STORAGE_KEYS.ATTENDANCE_HISTORY,
        JSON.stringify(data)
      )
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ATTENDANCE_HISTORY)
    }
  } catch (err) {
    console.warn("Failed to cache attendance history offline:", err)
  }
}

export async function getCachedAttendanceHistory<T = unknown>(): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEYS.ATTENDANCE_HISTORY)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

// --- Offline Attendance Queue ---

export async function getAttendanceQueue(): Promise<QueuedAttendance[]> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEYS.QUEUE)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as QueuedAttendance[]) : []
  } catch {
    return []
  }
}

export async function enqueueAttendance(
  item: Omit<QueuedAttendance, "id" | "createdAt">
): Promise<QueuedAttendance> {
  const current = await getAttendanceQueue()
  const queuedItem: QueuedAttendance = {
    ...item,
    id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    createdAt: new Date().toISOString()
  }

  const updatedQueue = [...current, queuedItem]
  await SecureStore.setItemAsync(
    STORAGE_KEYS.QUEUE,
    JSON.stringify(updatedQueue)
  )

  // Also immediately update the cached today log so UI shows the new shift state offline
  const cachedToday = await getCachedTodayAttendance()
  if (item.action === "IN") {
    const newLog: AttendanceLog = {
      id: queuedItem.id,
      clockIn: item.occurredAt,
      clockOut: null,
      branch: item.branchName ? { name: item.branchName } : null,
      clockInLocationFailureReason: item.locationFailureReason ?? null,
      isOfflinePending: true
    }
    await saveCachedTodayAttendance(newLog)
  } else if (item.action === "OUT") {
    const updatedLog: AttendanceLog = {
      ...(cachedToday ?? {
        id: queuedItem.id,
        clockIn: item.occurredAt,
        clockOut: null
      }),
      clockOut: item.occurredAt,
      clockOutBranch: item.branchName ? { name: item.branchName } : null,
      clockOutLocationFailureReason: item.locationFailureReason ?? null,
      isOfflinePending: true
    }
    await saveCachedTodayAttendance(updatedLog)
  }

  return queuedItem
}

export async function removeFromAttendanceQueue(id: string): Promise<void> {
  const current = await getAttendanceQueue()
  const updated = current.filter((entry) => entry.id !== id)
  await SecureStore.setItemAsync(STORAGE_KEYS.QUEUE, JSON.stringify(updated))
}

export async function clearAttendanceQueue(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.QUEUE)
}
