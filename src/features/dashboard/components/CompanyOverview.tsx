import { Text, View } from "react-native"
import { Card, SectionTitle, colors, styles } from "../../../ui"
import { moneylessNumber } from "../../../shared/common"
import type { CompanyStats } from "../dashboard.types"
import { ProgressBar, withAlpha } from "./primitives"

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View
      style={{
        minWidth: "47%",
        flexGrow: 1,
        borderRadius: 14,
        padding: 13,
        gap: 6,
        backgroundColor: withAlpha(color, "14"),
        borderColor: withAlpha(color, "33"),
        borderWidth: 1
      }}
    >
      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 0.7 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ color, fontSize: 28, fontWeight: "800" }}>{value}</Text>
    </View>
  )
}

export function CompanyOverview({ stats }: { stats: CompanyStats }) {
  const total = moneylessNumber(stats.totalEmployees)
  const present = moneylessNumber(stats.presentToday)
  const rate = total > 0 ? Math.round((present / total) * 100) : 0
  const failures = stats.recentLocationFailures ?? []

  return (
    <View style={{ gap: 14 }}>
      <Card>
        <SectionTitle title="Company overview" />
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Attendance today</Text>
            <Text style={{ color: colors.green, fontSize: 12, fontWeight: "800" }}>
              {present} / {total} · {rate}%
            </Text>
          </View>
          <ProgressBar percent={rate} color={colors.green} height={10} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <Stat label="Employees" value={total} color={colors.primary} />
          <Stat label="Present" value={present} color={colors.green} />
          <Stat label="On leave" value={moneylessNumber(stats.onLeave)} color={colors.orange} />
          <Stat label="Pending approvals" value={moneylessNumber(stats.pendingApprovals)} color={colors.red} />
          <Stat label="Location failures" value={moneylessNumber(stats.locationFailuresCount)} color={colors.red} />
        </View>
      </Card>

      {failures.length > 0 ? (
        <Card style={{ borderColor: withAlpha(colors.red, "40") }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <SectionTitle title="Location Verification Failures" />
            <View
              style={{
                backgroundColor: colors.redSoft,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 8
              }}
            >
              <Text style={{ color: colors.red, fontSize: 11, fontWeight: "800" }}>
                {failures.length} ALERT{failures.length > 1 ? "S" : ""}
              </Text>
            </View>
          </View>

          <Text style={{ color: colors.muted, fontSize: 12, marginTop: -4 }}>
            Attendance recorded outside designated branch perimeters
          </Text>

          <View style={{ gap: 10, marginTop: 6 }}>
            {failures.map((item) => {
              const emp = item.employee
              const isClockOutFailed = item.clockOutLocationVerified === false
              const reason = isClockOutFailed
                ? item.clockOutLocationFailureReason
                : item.clockInLocationFailureReason
              const branchName = isClockOutFailed
                ? item.clockOutBranch?.name
                : item.branch?.name
              const distance = isClockOutFailed
                ? item.clockOutDistanceMeters
                : item.distanceMeters
              const actionText = isClockOutFailed ? "Clock Out" : "Clock In"
              const shiftTime = isClockOutFailed ? item.clockOut : item.clockIn

              return (
                <View
                  key={item.id}
                  style={{
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.line,
                    padding: 12,
                    backgroundColor: colors.surfaceAlt,
                    gap: 6
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <View>
                      <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 14 }}>
                        {emp?.fullName ?? "Employee"}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600" }}>
                        Code: {emp?.employeeCode ?? "N/A"} {emp?.email ? `· ${emp.email}` : ""}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: reason ? colors.primarySoft : colors.redSoft,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6
                      }}
                    >
                      <Text
                        style={{
                          color: reason ? colors.primary : colors.red,
                          fontSize: 10,
                          fontWeight: "800"
                        }}
                      >
                        {reason ? "REASON SUBMITTED" : "REASON PENDING"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.muted}>
                    {actionText} ·{" "}
                    {shiftTime
                      ? new Date(shiftTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })
                      : "N/A"}{" "}
                    · {shiftTime ? new Date(shiftTime).toISOString().slice(0, 10) : ""}
                  </Text>

                  <Text style={{ color: colors.red, fontSize: 12, fontWeight: "700" }}>
                    ⚠️{" "}
                    {distance
                      ? `${distance}m away from ${branchName || "branch perimeter"}`
                      : "Outside branch perimeter (invalid GPS)"}
                  </Text>

                  {reason ? (
                    <Text
                      style={{
                        color: colors.ink,
                        fontSize: 12,
                        fontStyle: "italic",
                        backgroundColor: colors.surface,
                        padding: 8,
                        borderRadius: 6
                      }}
                    >
                      "{reason}"
                    </Text>
                  ) : (
                    <Text style={{ color: colors.muted, fontSize: 11 }}>
                      Pending explanation from employee
                    </Text>
                  )}
                </View>
              )
            })}
          </View>
        </Card>
      ) : null}
    </View>
  )
}
