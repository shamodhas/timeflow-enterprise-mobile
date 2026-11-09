import { useCallback, useEffect, useState } from "react"
import { Text, View } from "react-native"

import { api } from "../../api"
import { Card, DateField, EmptyState, Field, Heading, Notice, SectionTitle, SkeletonList, colors, styles } from "../../ui"

import { formatIssueDateTime, formatTime, rowsFrom } from "../attendance/attendance.utils"
import type { AttendanceLog } from "../attendance/attendance.types"
import { messageFrom } from "../../shared/common"

export function ManagementAttendancePanel() {
  const [date, setDate] = useState("")
  const [search, setSearch] = useState("")
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const result = await api.get<unknown>(
        `/attendance/all${date ? `?date=${encodeURIComponent(date)}` : ""}`
      )
      setLogs(rowsFrom(result))
    } catch (loadError) {
      setError(messageFrom(loadError))
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    void load()
  }, [load])

  const filteredLogs = logs.filter((log) => {
    const recordDate = log.createdAt ?? log.clockIn
    const isoDate = recordDate ? new Date(recordDate).toISOString().slice(0, 10) : ""
    const employee = log.employee
    const term = search.trim().toLowerCase()
    return (
      (!date || isoDate === date) &&
      (!term ||
        employee?.fullName?.toLowerCase().includes(term) ||
        employee?.employeeCode?.toLowerCase().includes(term))
    )
  })

  return (
    <View style={{ gap: 14 }}>
      {error ? <Notice>{error}</Notice> : null}
      <Card>
        <Heading
          title="All Employees Attendance"
          subtitle="Monitor daily clock-in and clock-out logs of all staff members."
        />
        <DateField label="Date" value={date} onChangeText={setDate} allowClear />
        <Field label="Search by name or code" value={search} onChangeText={setSearch} placeholder="Search by name or code..." />
      </Card>
      <Card>
        <SectionTitle title={loading ? "Attendance records" : `${filteredLogs.length} shift(s)`} />
        {loading ? <SkeletonList rows={5} /> : null}
        {!filteredLogs.length && !loading ? <EmptyState>No attendance records match the selected filters.</EmptyState> : null}
        {!loading && filteredLogs.map((log) => {
          const employeeName = log.employee?.fullName ?? "Employee"
          const code = log.employee?.employeeCode
          return (
            <View key={log.id} style={{ borderTopColor: colors.line, borderTopWidth: 1, paddingTop: 12, gap: 5 }}>
              <Text style={{ color: colors.ink, fontWeight: "800" }}>
                {code ?? "N/A"} Â· {employeeName}
              </Text>
              {log.employee?.email ? <Text style={styles.muted}>{log.employee.email}</Text> : null}
              <Text style={styles.muted}>
                Date: {log.createdAt ? new Date(log.createdAt).toISOString().slice(0, 10) : "N/A"}
              </Text>
              <Text style={styles.muted}>
                {formatTime(log.clockIn)} â†’ {formatTime(log.clockOut)}
                {log.clockOut ? "" : " Â· Active / Not Out"}
              </Text>
              <Text style={styles.muted}>
                In: {log.branch?.name ?? "Unrecorded"} Â· Out: {log.clockOutBranch?.name ?? (log.clockOut ? "Unrecorded" : "â€”")}
              </Text>
              {log.locationVerified === false ? (
                <Text style={{ color: log.clockInLocationFailureReason ? colors.red : colors.orange, fontSize: 12 }}>
                  In: {log.clockInLocationFailureReason || "Pending employee explanation"}
                  {log.clockInLocationFailedAt ? ` (${formatIssueDateTime(log.clockInLocationFailedAt)})` : ""}
                </Text>
              ) : null}
              {log.clockOutLocationVerified === false ? (
                <Text style={{ color: log.clockOutLocationFailureReason ? colors.red : colors.orange, fontSize: 12 }}>
                  Out: {log.clockOutLocationFailureReason || "Pending employee explanation"}
                  {log.clockOutLocationFailedAt ? ` (${formatIssueDateTime(log.clockOutLocationFailedAt)})` : ""}
                </Text>
              ) : null}
              {log.locationVerified !== false && log.clockOutLocationVerified !== false ? (
                <Text style={styles.muted}>Location issue: None</Text>
              ) : null}
              <View
                style={{
                  alignSelf: "flex-start",
                  borderRadius: 7,
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                  backgroundColor: log.status === "PRESENT" ? colors.greenSoft : colors.orangeSoft
                }}
              >
                <Text style={{ color: log.status === "PRESENT" ? colors.green : colors.orange, fontSize: 10, fontWeight: "800" }}>
                  {log.status ?? "N/A"}
                </Text>
              </View>
            </View>
          )
        })}
      </Card>
    </View>
  )
}
