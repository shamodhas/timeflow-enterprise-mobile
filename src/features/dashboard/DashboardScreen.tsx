import { useCallback, useEffect, useState } from "react"
import { Text, View } from "react-native"

import { api, isManagementRole, type User } from "../../api"
import { Heading, Notice, Page, DashboardSkeleton, colors } from "../../ui"

import { AttendanceClock } from "../attendance/AttendanceClock"
import type { AttendanceLog } from "../attendance/attendance.types"
import { messageFrom, moneylessNumber } from "../../shared/common"
import type { CompanyStats, PersonalStats } from "./dashboard.types"
import { CompanyOverview } from "./components/CompanyOverview"
import { LeaveBalanceCard } from "./components/LeaveBalanceCard"
import { LeaveBreakdown } from "./components/LeaveBreakdown"
import { withAlpha } from "./components/primitives"

const greeting = () => {
  const hour = new Date().getHours()
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
}

function QuickStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 14,
        padding: 12,
        gap: 4,
        backgroundColor: withAlpha(color, "14"),
        borderColor: withAlpha(color, "33"),
        borderWidth: 1
      }}
    >
      <Text style={{ color, fontSize: 24, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700" }}>{label}</Text>
    </View>
  )
}

export function DashboardScreen({ user }: { user: User }) {
  const [company, setCompany] = useState<CompanyStats | null>(null)
  const [personal, setPersonal] = useState<PersonalStats | null>(null)
  const [todayLog, setTodayLog] = useState<AttendanceLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const personalSummary = user.role === "EMPLOYEE" || user.role === "HR"
  const leaveByType = Array.isArray(personal?.leaveByType) ? personal.leaveByType : []

  const load = useCallback(async () => {
    setError("")
    try {
      const tasks: Promise<unknown>[] = []
      if (isManagementRole(user.role)) {
        tasks.push(api.get<CompanyStats>("/dashboard/company").then(setCompany))
      }
      if (personalSummary) {
        tasks.push(
          api.get<PersonalStats>("/dashboard/me").then(setPersonal),
          api.get<AttendanceLog | null>("/attendance/me/today").then((data) =>
            setTodayLog(data ?? null)
          )
        )
      }
      await Promise.all(tasks)
    } catch (loadError) {
      setError(messageFrom(loadError))
    } finally {
      setLoading(false)
    }
  }, [personalSummary, user.role])

  useEffect(() => {
    void load()
  }, [load])

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  })

  return (
    <Page contentStyle={{ flexGrow: 1 }}>
      {personalSummary ? (
        <Heading
          title={`${greeting()}, ${user.fullName.split(" ")[0]}`}
          subtitle={today}
        />
      ) : null}
      {error ? <Notice>{error}</Notice> : null}
      {loading ? (
        <DashboardSkeleton personal={personalSummary} company={isManagementRole(user.role)} />
      ) : null}
      {!loading && personalSummary ? (
        <>
          <AttendanceClock todayLog={todayLog} onComplete={load} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <QuickStat label="Present this month" value={moneylessNumber(personal?.thisMonthPresent)} color={colors.green} />
            <QuickStat label="Pending leaves" value={moneylessNumber(personal?.pendingPersonalLeaves)} color={colors.orange} />
            <QuickStat label="Leaves used" value={moneylessNumber(personal?.usedLeaves)} color={colors.primary} />
          </View>
          <LeaveBalanceCard types={leaveByType} />
          <LeaveBreakdown types={leaveByType} />
        </>
      ) : null}
      {!loading && company ? <CompanyOverview stats={company} /> : null}
    </Page>
  )
}
