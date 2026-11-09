export type LeaveBalance = {
  leaveTypeId: string
  leaveType: string
  balance: string | number
}

export type LeaveTaken = {
  leaveTypeId: string
  leaveType: string
  taken: string | number
}

export type LeaveType = { id: string; name: string; defaultQuota?: number }

export type LeaveRequest = {
  id: string
  startDate: string
  endDate: string
  totalDays: string | number
  status: "PENDING" | "APPROVED" | "REJECTED"
  reason?: string | null
  session?: string
  employee?: { fullName?: string; employeeCode?: string }
  leaveType?: { name?: string }
  actingEmployee?: { fullName?: string } | null
}

export const formatLeaveDays = (value: number | string) => {
  const quarters = Math.round(Number(value || 0) * 4)
  const days = Math.floor(quarters / 4)
  const rest = quarters % 4
  const parts: string[] = []
  if (days) parts.push(` ${days === 1 ? "day" : "days"}`)
  if (Math.floor(rest / 2)) parts.push("1 half day")
  if (rest % 2) parts.push("1 short")
  return parts.length ? parts.join(" and ") : "0 days"
}
