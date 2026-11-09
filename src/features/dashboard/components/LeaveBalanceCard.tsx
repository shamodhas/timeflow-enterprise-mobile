import { Text, View } from "react-native"
import { Card, colors } from "../../../ui"
import { moneylessNumber } from "../../../shared/common"
import type { LeaveTypeSummary } from "../dashboard.types"
import { Chip, ProgressBar, typeColors } from "./primitives"

export function LeaveBalanceCard({ types }: { types: LeaveTypeSummary[] }) {
  const remaining = types.reduce((sum, t) => sum + t.available, 0)
  const used = types.reduce((sum, t) => sum + t.used, 0)
  const total = remaining + used
  const percent = total > 0 ? Math.round((used / total) * 100) : 0
  const low = total > 0 && remaining / total <= 0.25
  const barColor =
    percent >= 80 ? colors.red : percent >= 50 ? colors.orange : colors.green
  const palette = typeColors()
  const usedTypes = types.filter((type) => type.used > 0)

  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "800", letterSpacing: 0.7 }}>
          LEAVE BALANCE · {new Date().getFullYear()}
        </Text>
        {low ? <Chip label="Low balance" color={colors.red} /> : <Chip label="On track" color={colors.green} />}
      </View>

      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
        <Text style={{ color: colors.ink, fontSize: 46, fontWeight: "800", lineHeight: 52 }}>
          {moneylessNumber(remaining)}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 15, paddingBottom: 8 }}>
          of {moneylessNumber(total)} days remaining
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        <ProgressBar percent={percent} color={barColor} height={10} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{moneylessNumber(used)} used</Text>
          <Text style={{ color: barColor, fontSize: 12, fontWeight: "800" }}>
            {percent}% utilized
          </Text>
        </View>
      </View>

      {usedTypes.length > 1 ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", height: 6, borderRadius: 3, overflow: "hidden", gap: 2 }}>
            {usedTypes.map((type) => (
              <View
                key={type.leaveTypeId}
                style={{
                  flex: type.used,
                  backgroundColor: palette[types.indexOf(type) % palette.length]
                }}
              />
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {usedTypes.map((type) => (
              <View key={type.leaveTypeId} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: palette[types.indexOf(type) % palette.length]
                  }}
                />
                <Text style={{ color: colors.muted, fontSize: 11 }}>{type.name}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Card>
  )
}
