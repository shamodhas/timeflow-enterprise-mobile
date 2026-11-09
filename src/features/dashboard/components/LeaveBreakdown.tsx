import { Text, View } from "react-native"
import { Card, EmptyState, SectionTitle, colors } from "../../../ui"
import { moneylessNumber } from "../../../shared/common"
import type { LeaveTypeSummary } from "../dashboard.types"
import { ProgressBar, typeColors, withAlpha } from "./primitives"

function SessionTile({
  label,
  value,
  caption,
  color
}: {
  label: string
  value: number
  caption: string
  color: string
}) {
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
      <Text style={{ color, fontSize: 11, fontWeight: "800", letterSpacing: 0.6 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ color: colors.ink, fontSize: 26, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 11 }}>{caption}</Text>
    </View>
  )
}

export function LeaveBreakdown({ types }: { types: LeaveTypeSummary[] }) {
  const palette = typeColors()
  const full = types.reduce((sum, t) => sum + t.full, 0)
  const half = types.reduce((sum, t) => sum + t.half, 0)
  const short = types.reduce((sum, t) => sum + t.short, 0)

  return (
    <Card>
      <SectionTitle title="Leave breakdown" />

      <View style={{ flexDirection: "row", gap: 10 }}>
        <SessionTile label="Full day" value={full} caption="Requests" color={colors.primary} />
        <SessionTile label="Half day" value={half} caption="Occurrences" color={colors.orange} />
        <SessionTile label="Short" value={short} caption="Quick leaves" color={colors.green} />
      </View>

      {types.length ? (
        <View style={{ gap: 14 }}>
          {types.map((type, index) => {
            const color = palette[index % palette.length]
            const allocated = type.available + type.used
            const percent = allocated > 0 ? (type.used / allocated) * 100 : 0
            return (
              <View key={type.leaveTypeId} style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                    <Text style={{ color: colors.ink, fontSize: 14, fontWeight: "700" }}>
                      {type.name}
                    </Text>
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    <Text style={{ color: colors.ink, fontWeight: "800" }}>
                      {moneylessNumber(type.used)}
                    </Text>
                    {" taken · "}
                    {moneylessNumber(type.available)} left
                  </Text>
                </View>
                <ProgressBar percent={percent} color={color} height={6} />
                <Text style={{ color: colors.muted, fontSize: 11 }}>
                  {type.full} full · {type.half} half · {type.short} short
                </Text>
              </View>
            )
          })}
        </View>
      ) : (
        <EmptyState>No leave types configured yet.</EmptyState>
      )}
    </Card>
  )
}
