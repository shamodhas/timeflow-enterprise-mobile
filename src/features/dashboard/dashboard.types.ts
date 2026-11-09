export type LeaveTypeSummary = {
  leaveTypeId: string
  name: string
  available: number
  used: number
  full: number
  short: number
  half: number
}

export type PersonalStats = {
  availableLeaves?: number
  usedLeaves?: number
  thisMonthPresent?: number
  pendingPersonalLeaves?: number
  leaveByType?: LeaveTypeSummary[]
}

export type LocationFailureCase = {
  id: string
  clockIn: string
  clockOut: string | null
  createdAt?: string
  distanceMeters?: number | null
  clockOutDistanceMeters?: number | null
  locationVerified?: boolean | null
  clockOutLocationVerified?: boolean | null
  clockInLocationFailureReason?: string | null
  clockOutLocationFailureReason?: string | null
  clockInLocationFailedAt?: string | null
  clockOutLocationFailedAt?: string | null
  employee?: {
    id: string
    fullName: string
    employeeCode: string
    email?: string
  }
  branch?: { id: string; name: string } | null
  clockOutBranch?: { id: string; name: string } | null
}

export type CompanyStats = {
  totalEmployees?: number
  presentToday?: number
  onLeave?: number
  pendingApprovals?: number
  locationFailuresCount?: number
  recentLocationFailures?: LocationFailureCase[]
}
