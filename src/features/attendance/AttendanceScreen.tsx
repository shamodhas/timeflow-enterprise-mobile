import { useCallback, useEffect, useState } from "react"
import { RefreshControl, ScrollView, Text, View } from "react-native"

import { api, isNetworkError } from "../../api"
import {
  Button,
  Card,
  EmptyState,
  Field,
  Heading,
  Notice,
  SectionTitle,
  SkeletonCard,
  colors,
  styles
} from "../../ui"

import { AttendanceClock } from "./AttendanceClock"
import {
  formatDate,
  formatIssueDateTime,
  formatTime,
  isTodayInColombo,
  rowsFrom
} from "./attendance.utils"
import type { AttendanceLog } from "./attendance.types"
import { messageFrom } from "../../shared/common"
import {
  checkIsOnline,
  getAttendanceQueue,
  getCachedAttendanceHistory,
  getCachedTodayAttendance,
  saveCachedAttendanceHistory,
  saveCachedTodayAttendance,
  subscribeToSyncEvents,
  syncPendingAttendance
} from "../../shared/offline"

export function AttendanceScreen({
  isOfflineMode = false
}: {
  isOfflineMode?: boolean
}) {
  const [today, setToday] = useState<AttendanceLog | null>(null)
  const [weeks, setWeeks] = useState<{ title: string; rows: AttendanceLog[] }[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncStatusMsg, setSyncStatusMsg] = useState("")
  const [reasonInput, setReasonInput] = useState("")
  const [submittingReason, setSubmittingReason] = useState(false)
  const [activeReasonLogId, setActiveReasonLogId] = useState<string | null>(null)
  const [activeReasonType, setActiveReasonType] = useState<"IN" | "OUT">("IN")

  const processHistoryData = (history: unknown) => {
    return history && typeof history === "object" && !Array.isArray(history)
      ? Object.entries(history as Record<string, unknown>)
          .filter((entry): entry is [string, AttendanceLog[]] => Array.isArray(entry[1]))
          .sort(([first], [second]) => {
            const firstWeek = Number(first.replace(/\D/g, "")) || 0
            const secondWeek = Number(second.replace(/\D/g, "")) || 0
            return secondWeek - firstWeek
          })
          .map(([title, rows]) => ({
            title,
            rows: [...rows].sort(
              (first, second) => +new Date(second.clockIn) - +new Date(first.clockIn)
            )
          }))
      : rowsFrom(history).length
        ? [{ title: "Recent shifts", rows: rowsFrom(history) }]
        : []
  }

  const load = useCallback(async () => {
    setError("")
    const queue = await getAttendanceQueue()
    setPendingCount(queue.length)

    const online = !isOfflineMode && (await checkIsOnline())

    if (!online) {
      // Offline: Read from local cache
      const cachedToday = await getCachedTodayAttendance()
      const cachedHistory = await getCachedAttendanceHistory()
      setToday(cachedToday)
      if (cachedHistory) {
        setWeeks(processHistoryData(cachedHistory))
      }
      setLoading(false)
      setRefreshing(false)
      return
    }

    try {
      const [history, todayResult] = await Promise.all([
        api.get<unknown>("/attendance/me"),
        api.get<AttendanceLog | null>("/attendance/me/today")
      ])

      const groupedHistory = processHistoryData(history)
      setWeeks(groupedHistory)
      setToday(todayResult ?? null)

      // Update cache in background
      void saveCachedTodayAttendance(todayResult ?? null)
      void saveCachedAttendanceHistory(history)
    } catch (loadError) {
      if (isNetworkError(loadError)) {
        // Fallback to local cache on network error
        const cachedToday = await getCachedTodayAttendance()
        const cachedHistory = await getCachedAttendanceHistory()
        setToday(cachedToday)
        if (cachedHistory) {
          setWeeks(processHistoryData(cachedHistory))
        }
      } else {
        setError(messageFrom(loadError))
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [isOfflineMode])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const unsubscribe = subscribeToSyncEvents((event) => {
      if (event.type === "sync_start") {
        setSyncing(true)
        setSyncStatusMsg(event.message || "Syncing offline records...")
      } else if (event.type === "sync_complete") {
        setSyncing(false)
        setPendingCount(event.queueCount)
        setSyncStatusMsg(event.message || "")
        void load()
      } else if (event.type === "connectivity_change") {
        void load()
      }
    })
    return unsubscribe
  }, [load])

  const handleManualSync = async () => {
    setSyncing(true)
    try {
      const res = await syncPendingAttendance()
      setPendingCount(res.remaining)
      if (res.synced > 0) {
        setSyncStatusMsg(`Synced ${res.synced} offline shift${res.synced > 1 ? "s" : ""}.`)
      }
      await load()
    } finally {
      setSyncing(false)
    }
  }

  const submitLocationReason = async (id: string, type: "IN" | "OUT") => {
    if (reasonInput.trim().length < 5) {
      setError("Please enter a reason of at least 5 characters.")
      return
    }
    setSubmittingReason(true)
    setError("")
    try {
      await api.patch(`/attendance/${id}/location-reason`, {
        reason: reasonInput.trim(),
        type
      })
      setReasonInput("")
      setActiveReasonLogId(null)
      setSyncStatusMsg("Reason submitted. HR and management have been notified.")
      await load()
    } catch (submitErr) {
      setError(messageFrom(submitErr))
    } finally {
      setSubmittingReason(false)
    }
  }

  const todayNeedsInReason = Boolean(
    today && today.locationVerified === false && !today.clockInLocationFailureReason
  )
  const todayNeedsOutReason = Boolean(
    today &&
      today.clockOut &&
      today.clockOutLocationVerified === false &&
      !today.clockOutLocationFailureReason
  )

  return (
    <ScrollView
      contentContainerStyle={styles.page}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            void load()
          }}
          tintColor={colors.primary}
        />
      }
    >
      <Heading
        title="My Attendance"
        subtitle="Showing all records for this month, organized by week."
      />

      {/* Offline Status Banner */}
      {isOfflineMode || pendingCount > 0 ? (
        <Card
          style={{
            borderColor: isOfflineMode ? colors.orange : colors.primaryBorder,
            backgroundColor: isOfflineMode ? colors.orangeSoft : colors.primarySoft,
            gap: 8
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text
              style={{
                color: isOfflineMode ? colors.orange : colors.primary,
                fontWeight: "800",
                fontSize: 14
              }}
            >
              {isOfflineMode ? "📶 Offline Mode Active" : "🔄 Pending Offline Records"}
            </Text>
            {pendingCount > 0 ? (
              <View
                style={{
                  backgroundColor: isOfflineMode ? colors.orange : colors.primary,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 12
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>
                  {pendingCount} Pending
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={{ color: colors.ink, fontSize: 13, lineHeight: 18 }}>
            {isOfflineMode
              ? "No internet connection detected. You can clock in and out locally; the server will verify your location and synchronize records once reconnected."
              : `${pendingCount} record(s) queued for synchronization.`}
          </Text>
          {!isOfflineMode && pendingCount > 0 ? (
            <Button
              title="Sync now with server"
              compact
              onPress={() => void handleManualSync()}
              loading={syncing}
            />
          ) : null}
        </Card>
      ) : null}

      {/* Action Required: Location Exception Reason Prompt for Today */}
      {(todayNeedsInReason || todayNeedsOutReason) && today ? (
        <Card style={{ borderColor: colors.red, backgroundColor: colors.redSoft, gap: 10 }}>
          <Text style={{ color: colors.red, fontWeight: "900", fontSize: 15 }}>
            ⚠️ Action Required: Location Verification Notice
          </Text>
          <Text style={{ color: colors.ink, fontSize: 13, lineHeight: 18 }}>
            Your {todayNeedsInReason ? "clock-in" : "clock-out"} was recorded outside approved branch boundaries. Please submit an explanation for HR approval.
          </Text>
          <Field
            label="Explanation / Reason (required)"
            value={reasonInput}
            onChangeText={setReasonInput}
            placeholder="e.g. Working at client site, meeting on the road"
            multiline
          />
          <Button
            title="Submit Explanation to HR"
            variant="danger"
            onPress={() =>
              void submitLocationReason(
                today.id,
                todayNeedsInReason ? "IN" : "OUT"
              )
            }
            loading={submittingReason}
            disabled={reasonInput.trim().length < 5}
          />
        </Card>
      ) : null}

      {syncStatusMsg ? <Notice tone="info">{syncStatusMsg}</Notice> : null}
      {error ? <Notice>{error}</Notice> : null}

      {loading ? (
        <>
          <SkeletonCard rows={1} />
          <SkeletonCard rows={4} />
        </>
      ) : (
        <>
          <AttendanceClock
            todayLog={today}
            onComplete={load}
            isOfflineMode={isOfflineMode}
          />
          {!weeks.length ? (
            <Card>
              <EmptyState>No attendance records found for this month.</EmptyState>
            </Card>
          ) : (
            weeks.map((week) => (
              <Card key={week.title}>
                <SectionTitle title={week.title} />
                {week.rows.map((log) => {
                  const inNeedsReason =
                    log.locationVerified === false && !log.clockInLocationFailureReason
                  const outNeedsReason =
                    log.clockOutLocationVerified === false && !log.clockOutLocationFailureReason
                  const isPromptingForLog = activeReasonLogId === log.id

                  return (
                    <View
                      key={log.id}
                      style={{
                        borderTopColor: colors.line,
                        borderTopWidth: 1,
                        paddingTop: 12,
                        gap: 6
                      }}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ color: colors.ink, fontWeight: "800" }}>
                          {formatDate(log.clockIn)}
                          {isTodayInColombo(log.clockIn) ? " · Today" : ""}
                        </Text>
                        {log.isOfflinePending ? (
                          <Text style={{ color: colors.orange, fontSize: 11, fontWeight: "700" }}>
                            ● Offline
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.muted}>
                        In {formatTime(log.clockIn)} · Out {formatTime(log.clockOut)}
                        {!log.clockOut ? " · Active Shift" : ""}
                      </Text>
                      <Text style={styles.muted}>
                        In: {log.branch?.name ?? "Unrecorded"} · Out:{" "}
                        {log.clockOutBranch?.name ?? (log.clockOut ? "Unrecorded" : "—")}
                      </Text>

                      {/* Clock In location status */}
                      {log.locationVerified === false ? (
                        <View style={{ gap: 2 }}>
                          {log.clockInLocationFailureReason ? (
                            <Text style={{ color: colors.red, fontSize: 12 }}>
                              In Location Issue: {log.clockInLocationFailureReason}
                              {log.clockInLocationFailedAt
                                ? ` (${formatIssueDateTime(log.clockInLocationFailedAt)})`
                                : ""}
                            </Text>
                          ) : (
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                              <Text style={{ color: colors.red, fontSize: 12, fontWeight: "700" }}>
                                In Location: Outside branch · Reason pending
                              </Text>
                              {!isPromptingForLog ? (
                                <Button
                                  title="Add reason"
                                  compact
                                  variant="secondary"
                                  onPress={() => {
                                    setActiveReasonLogId(log.id)
                                    setActiveReasonType("IN")
                                    setReasonInput("")
                                  }}
                                />
                              ) : null}
                            </View>
                          )}
                        </View>
                      ) : null}

                      {/* Clock Out location status */}
                      {log.clockOutLocationVerified === false ? (
                        <View style={{ gap: 2 }}>
                          {log.clockOutLocationFailureReason ? (
                            <Text style={{ color: colors.red, fontSize: 12 }}>
                              Out Location Issue: {log.clockOutLocationFailureReason}
                              {log.clockOutLocationFailedAt
                                ? ` (${formatIssueDateTime(log.clockOutLocationFailedAt)})`
                                : ""}
                            </Text>
                          ) : (
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                              <Text style={{ color: colors.red, fontSize: 12, fontWeight: "700" }}>
                                Out Location: Outside branch · Reason pending
                              </Text>
                              {!isPromptingForLog ? (
                                <Button
                                  title="Add reason"
                                  compact
                                  variant="secondary"
                                  onPress={() => {
                                    setActiveReasonLogId(log.id)
                                    setActiveReasonType("OUT")
                                    setReasonInput("")
                                  }}
                                />
                              ) : null}
                            </View>
                          )}
                        </View>
                      ) : null}

                      {/* Inline reason entry field if expanded */}
                      {isPromptingForLog ? (
                        <View style={{ gap: 8, marginTop: 4, padding: 10, backgroundColor: colors.surfaceAlt, borderRadius: 10 }}>
                          <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 12 }}>
                            Explanation for {activeReasonType === "IN" ? "Clock In" : "Clock Out"} outside branch:
                          </Text>
                          <Field
                            label="Reason"
                            value={reasonInput}
                            onChangeText={setReasonInput}
                            placeholder="Enter reason..."
                            multiline
                          />
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            <Button
                              title="Cancel"
                              compact
                              variant="secondary"
                              onPress={() => setActiveReasonLogId(null)}
                            />
                            <Button
                              title="Submit"
                              compact
                              variant="primary"
                              onPress={() => void submitLocationReason(log.id, activeReasonType)}
                              loading={submittingReason}
                              disabled={reasonInput.trim().length < 5}
                            />
                          </View>
                        </View>
                      ) : null}

                      {log.locationVerified !== false && log.clockOutLocationVerified !== false ? (
                        <Text style={styles.muted}>Location issue: None</Text>
                      ) : null}
                      {log.status ? (
                        <Text style={styles.muted}>Status: {log.status}</Text>
                      ) : null}
                    </View>
                  )
                })}
              </Card>
            ))
          )}
        </>
      )}
    </ScrollView>
  )
}
