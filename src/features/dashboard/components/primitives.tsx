import { Text, View } from "react-native"
import { colors } from "../../../ui"

export const withAlpha = (hex: string, alpha: string) => `${hex}${alpha}`

export const typeColors = () => [
  colors.primary,
  colors.green,
  colors.orange,
  colors.red,
  colors.muted
]

export function ProgressBar({
  percent,
  color,
  height = 8
}: {
  percent: number
  color: string
  height?: number
}) {
  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: colors.surfaceAlt,
        overflow: "hidden"
      }}
    >
      <View
        style={{
          height,
          width: `${Math.max(0, Math.min(100, percent))}%`,
          borderRadius: height / 2,
          backgroundColor: color
        }}
      />
    </View>
  )
}

export function Chip({
  label,
  color
}: {
  label: string
  color: string
}) {
  return (
    <Text
      style={{
        color,
        backgroundColor: withAlpha(color, "1f"),
        fontSize: 11,
        fontWeight: "800",
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 8,
        overflow: "hidden"
      }}
    >
      {label}
    </Text>
  )
}
