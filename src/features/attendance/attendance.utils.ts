import type { AttendanceLog } from "./attendance.types"

export function rowsFrom(value: unknown): AttendanceLog[] {
  if (Array.isArray(value)) return value as AttendanceLog[]
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((item) =>
      Array.isArray(item) ? (item as AttendanceLog[]) : []
    )
  }
  return []
}

export function formatTime(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString("en-LK", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Colombo"
      })
}

export function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-LK", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "Asia/Colombo"
      })
}

export function isTodayInColombo(value: string) {
  const options: Intl.DateTimeFormatOptions = { timeZone: "Asia/Colombo" }
  return (
    new Date(value).toLocaleDateString("en-LK", options) ===
    new Date().toLocaleDateString("en-LK", options)
  )
}

export function formatIssueDateTime(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-LK", {
        dateStyle: "short",
        timeStyle: "medium",
        timeZone: "Asia/Colombo"
      }).format(date)
}
