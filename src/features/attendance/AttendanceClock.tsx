import { useState } from "react"
import { Text, View } from "react-native"
import * as Location from "expo-location"
import { api, ApiError, isNetworkError } from "../../api"
import { Button, Card, Field, Metric, Notice, SectionTitle, colors, styles } from "../../ui"
import { messageFrom } from "../../shared/common"
import type { AttendanceLog, ClockAction, Coordinates } from "./attendance.types"
import { formatTime } from "./attendance.utils"
import { checkIsOnline, enqueueAttendance } from "../../shared/offline"

export function AttendanceClock({
  todayLog,
  onComplete,
  isOfflineMode = false
}: {
  todayLog: AttendanceLog | null
  onComplete: () => Promise<void>
  isOfflineMode?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<{
    action: ClockAction
    coordinates: Coordinates | null
    message: string
  } | null>(null)
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const [offlineNotice, setOfflineNotice] = useState("")
  const active = Boolean(todayLog && !todayLog.clockOut)

  const handleOfflineClock = async (
    action: ClockAction,
    coordinates: Coordinates | null
  ): Promise<boolean> => {
    // Offline mode: No location verification on device (BE will verify on sync).
    // Simply capture coordinates & timestamp and save locally.
    await enqueueAttendance({
      action,
      occurredAt: new Date().toISOString(),
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      locationFailureReason: null
    })

    setPending(null)
    setReason("")
    setOfflineNotice("Shift recorded locally (offline). Verification and server sync will occur automatically once internet is restored.")
    await onComplete()
    return true
  }

  const clock = async (action: ClockAction, failureReason?: string) => {
    setBusy(true)
    setError("")
    setOfflineNotice("")
    let attemptedCoordinates: Coordinates | null = null

    try {
      let coordinates: Coordinates | null = null

      // Try reading location
      try {
        const permission = await Location.requestForegroundPermissionsAsync()
        if (permission.granted) {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced
          })
          coordinates = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          }
        }
      } catch {
        // Location read failed or denied
      }

      attemptedCoordinates = coordinates

      const isOnline = !isOfflineMode && (await checkIsOnline())

      if (!isOnline) {
        // Offline: Handle locally without client-side geofence blocking
        await handleOfflineClock(action, coordinates)
        return
      }

      // Online: Send to BE which performs location verification
      try {
        await api.post(
          `/attendance/clock-${action === "IN" ? "in" : "out"}`,
          {
            ...(coordinates ?? {}),
            ...(failureReason ? { locationFailureReason: failureReason } : {})
          }
        )
        setPending(null)
        setReason("")
        await onComplete()
      } catch (postError) {
        if (isNetworkError(postError)) {
          // If network dropped mid-request, record offline
          await handleOfflineClock(action, coordinates)
        } else {
          throw postError
        }
      }
    } catch (clockError) {
      if (
        clockError instanceof ApiError &&
        clockError.code === "LOCATION_VERIFICATION_FAILED"
      ) {
        setPending({
          action,
          coordinates: attemptedCoordinates,
          message: clockError.message
        })
      } else {
        setError(messageFrom(clockError))
      }
    } finally {
      setBusy(false)
    }
  }

  const submitReason = () => {
    if (!pending || reason.trim().length < 5) {
      setError("Enter a reason of at least 5 characters.")
      return
    }
    void clock(pending.action, reason.trim())
  }

  return (
    <Card style={{ borderColor: active ? colors.greenBorder : colors.line }}>
      <SectionTitle title="Today's shift" />
      {todayLog ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Metric label="Clock in" value={formatTime(todayLog.clockIn)} tint="green" />
            <Metric
              label={todayLog.clockOut ? "Clock out" : "Shift"}
              value={todayLog.clockOut ? formatTime(todayLog.clockOut) : "In progress"}
              tint={todayLog.clockOut ? "blue" : "orange"}
            />
          </View>
          {todayLog.isOfflinePending ? (
            <View
              style={{
                backgroundColor: colors.orangeSoft,
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 8,
                alignSelf: "flex-start"
              }}
            >
              <Text
                style={{
                  color: colors.orange,
                  fontSize: 12,
                  fontWeight: "700"
                }}
              >
                ● Offline entry (pending sync)
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={styles.muted}>No attendance has been recorded today.</Text>
      )}

      {offlineNotice ? <Notice tone="info">{offlineNotice}</Notice> : null}

      {pending ? (
        <View style={{ gap: 11 }}>
          <Notice tone="info">
            {pending.message} HR and management will be notified with your explanation.
          </Notice>
          <Field
            label="Reason (required, at least 5 characters)"
            value={reason}
            onChangeText={setReason}
            placeholder="Explain why location could not be verified"
            multiline
          />
          <View style={{ flexDirection: "row", gap: 9 }}>
            <View style={{ flex: 1 }}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => {
                  setPending(null)
                  setReason("")
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Continue & notify HR"
                onPress={submitReason}
                loading={busy}
                disabled={reason.trim().length < 5}
              />
            </View>
          </View>
        </View>
      ) : (
        <Button
          title={active ? "Clock out" : "Clock in"}
          variant={active ? "danger" : "success"}
          onPress={() => void clock(active ? "OUT" : "IN")}
          loading={busy}
          disabled={Boolean(todayLog?.clockOut)}
        />
      )}
      {error ? <Notice>{error}</Notice> : null}
    </Card>
  )
}
