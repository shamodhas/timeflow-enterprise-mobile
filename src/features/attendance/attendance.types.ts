export type AttendanceLog = {
  id: string
  clockIn: string
  clockOut: string | null
  createdAt?: string
  status?: string
  employee?: { fullName?: string; employeeCode?: string; email?: string }
  branch?: { name: string } | null
  clockOutBranch?: { name: string } | null
  clockInLocationFailureReason?: string | null
  clockInLocationFailedAt?: string | null
  clockOutLocationFailureReason?: string | null
  clockOutLocationFailedAt?: string | null
  locationVerified?: boolean | null
  clockOutLocationVerified?: boolean | null
  distanceMeters?: number | null
  clockOutDistanceMeters?: number | null
  isOfflinePending?: boolean
}

export type Coordinates = { latitude: number; longitude: number }
export type ClockAction = "IN" | "OUT"
