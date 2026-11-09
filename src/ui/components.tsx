import type { PropsWithChildren, ReactNode } from "react"
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
  type DimensionValue
} from "react-native"
import { useEffect, useRef, useState } from "react"
import DateTimePicker, {
  DateTimePickerAndroid
} from "@react-native-community/datetimepicker"
import { colors } from "./theme"
import { styles } from "./styles"

export function Page({
  children,
  contentStyle
}: PropsWithChildren<{ contentStyle?: object }>) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.page, contentStyle]}
    >
      {children}
    </ScrollView>
  )
}

export function Card({
  children,
  style
}: PropsWithChildren<{ style?: object }>) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function Heading({
  title,
  subtitle
}: {
  title: string
  subtitle?: string
}) {
  return (
    <View style={styles.heading}>
      <Text style={styles.headingTitle}>{title}</Text>
      {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
    </View>
  )
}

export function Label({ children }: PropsWithChildren) {
  return <Text style={styles.label}>{children}</Text>
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  multiline,
  autoCapitalize,
  editable = true
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  keyboardType?: "default" | "email-address" | "numeric" | "decimal-pad"
  secureTextEntry?: boolean
  multiline?: boolean
  autoCapitalize?: "none" | "sentences" | "words" | "characters"
  editable?: boolean
}) {
  return (
    <View style={styles.field}>
      <Label>{label}</Label>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        editable={editable}
        style={[styles.input, multiline && styles.multilineInput]}
      />
    </View>
  )
}

function parseDateValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return new Date()
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function formatDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function DateField({
  label,
  value,
  onChangeText,
  allowClear = false
}: {
  label: string
  value: string
  onChangeText: (value: string) => void
  allowClear?: boolean
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pendingDate, setPendingDate] = useState(new Date())

  const openPicker = () => {
    const initialDate = parseDateValue(value)
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: initialDate,
        mode: "date",
        display: "calendar",
        onChange: (event, date) => {
          if (event.type === "set" && date) onChangeText(formatDateValue(date))
        }
      })
      return
    }
    setPendingDate(initialDate)
    setPickerOpen(true)
  }

  return (
    <View style={styles.field}>
      <Label>{label}</Label>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Choose ${label}`}
          onPress={openPicker}
          style={({ pressed }) => [
            styles.input,
            {
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between"
            },
            pressed && styles.buttonPressed
          ]}
        >
          <Text style={{ color: value ? colors.ink : colors.placeholder, fontSize: 15 }}>
            {value || "Select date"}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 16 }}>▦</Text>
        </Pressable>
        {allowClear && value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            onPress={() => onChangeText("")}
            style={{
              minWidth: 44,
              borderColor: colors.line,
              borderWidth: 1,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Text style={{ color: colors.muted, fontWeight: "800" }}>×</Text>
          </Pressable>
        ) : null}
      </View>
      {Platform.OS !== "android" ? (
        <Modal
          visible={pickerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setPickerOpen(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: colors.overlay
            }}
          >
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 18,
                paddingBottom: 30
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <Text style={{ color: colors.ink, fontSize: 16, fontWeight: "800" }}>
                  {label}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    onChangeText(formatDateValue(pendingDate))
                    setPickerOpen(false)
                  }}
                  style={{ padding: 8 }}
                >
                  <Text style={{ color: colors.primary, fontWeight: "800" }}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={pendingDate}
                mode="date"
                display="spinner"
                onValueChange={(_, date) => setPendingDate(date)}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  )
}

export function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  compact = false
}: {
  title: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  variant?: "primary" | "secondary" | "danger" | "success"
  compact?: boolean
}) {
  const variantStyle = {
    primary: styles.buttonPrimary,
    secondary: styles.buttonSecondary,
    danger: styles.buttonDanger,
    success: styles.buttonSuccess
  }[variant]
  const textStyle =
    variant === "secondary" ? styles.buttonTextSecondary : styles.buttonText

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        variantStyle,
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.buttonPressed
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? colors.primary : "#fff"} />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </Pressable>
  )
}

export function ChoiceRow({
  options,
  value,
  onChange
}: {
  options: { label: string; value: string }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.choiceRow}>
        {options.map((option) => {
          const selected = option.value === value
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              onPress={() => onChange(option.value)}
              style={[styles.choice, selected && styles.choiceSelected]}
            >
              <Text
                style={[
                  styles.choiceText,
                  selected && styles.choiceTextSelected
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </ScrollView>
  )
}

export function Metric({
  label,
  value,
  tint = "blue"
}: {
  label: string
  value: string | number
  tint?: "blue" | "green" | "orange" | "red"
}) {
  const valueColor = {
    blue: colors.primary,
    green: colors.green,
    orange: colors.orange,
    red: colors.red
  }[tint]
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: valueColor }]}>{value}</Text>
    </View>
  )
}

export function EmptyState({ children }: PropsWithChildren) {
  return (
    <Text style={styles.emptyState}>
      {children}
    </Text>
  )
}

export function Notice({
  children,
  tone = "error"
}: PropsWithChildren<{ tone?: "error" | "success" | "info" }>) {
  const toneStyle = {
    error: styles.noticeError,
    success: styles.noticeSuccess,
    info: styles.noticeInfo
  }[tone]
  return <Text style={[styles.notice, toneStyle]}>{children}</Text>
}

export function SectionTitle({
  title,
  action
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionTitleText}>{title}</Text>
      {action}
    </View>
  )
}

export function SkeletonBlock({
  width = "100%",
  height = 14,
  radius = 8
}: {
  width?: DimensionValue
  height?: number
  radius?: number
}) {
  const progress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1250,
        easing: Easing.linear,
        useNativeDriver: true
      })
    )
    animation.start()
    return () => animation.stop()
  }, [progress])

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-180, 360]
  })

  return (
    <View
      accessible
      accessibilityLabel="Loading"
      style={[
        styles.skeleton,
        { width, height, borderRadius: radius }
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.skeletonShimmer,
          { transform: [{ translateX }] }
        ]}
      />
    </View>
  )
}

export function SkeletonMetrics({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.skeletonMetricGrid}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.skeletonMetric}>
          <SkeletonBlock width="38%" height={22} radius={6} />
          <SkeletonBlock width="72%" height={10} radius={5} />
        </View>
      ))}
    </View>
  )
}

export function SkeletonCard({
  rows = 3
}: {
  rows?: number
}) {
  return (
    <View style={styles.skeletonCard}>
      <SkeletonBlock width="42%" height={17} radius={6} />
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.skeletonRow}>
          <View style={{ flex: 1, gap: 9 }}>
            <SkeletonBlock width={index % 2 ? "58%" : "76%"} height={13} />
            <SkeletonBlock width={index % 2 ? "82%" : "64%"} height={10} radius={5} />
          </View>
          <SkeletonBlock width={38} height={38} radius={12} />
        </View>
      ))}
    </View>
  )
}

export function DashboardSkeleton({
  personal,
  company
}: {
  personal: boolean
  company: boolean
}) {
  return (
    <View style={{ gap: 16 }}>
      {personal ? (
        <>
          <View style={styles.skeletonCard}>
            <SkeletonBlock width="40%" height={17} />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <SkeletonBlock height={76} radius={15} />
              </View>
              <View style={{ flex: 1 }}>
                <SkeletonBlock height={76} radius={15} />
              </View>
            </View>
            <SkeletonBlock height={48} radius={12} />
          </View>
          <SkeletonMetrics />
        </>
      ) : null}
      {company ? <SkeletonMetrics /> : null}
      <SkeletonCard rows={2} />
    </View>
  )
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <View style={styles.skeletonCard}>
      <SkeletonBlock width="42%" height={17} radius={6} />
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={[styles.skeletonRow, styles.skeletonListRow]}>
          <SkeletonBlock width={42} height={42} radius={14} />
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonBlock width={index % 2 ? "58%" : "72%"} height={13} />
            <SkeletonBlock width={index % 2 ? "75%" : "48%"} height={10} radius={5} />
          </View>
          <SkeletonBlock width={58} height={26} radius={8} />
        </View>
      ))}
    </View>
  )
}
