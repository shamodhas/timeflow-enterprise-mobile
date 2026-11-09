import { Ionicons } from "@expo/vector-icons"
import type { ComponentProps } from "react"

export type IconName = ComponentProps<typeof Ionicons>["name"]

export const navIcons: Record<string, { idle: IconName; active: IconName }> = {
  Dashboard: { idle: "home-outline", active: "home" },
  Employees: { idle: "people-outline", active: "people" },
  Attendance: { idle: "time-outline", active: "time" },
  "All Attendance": { idle: "calendar-outline", active: "calendar" },
  Leaves: { idle: "document-text-outline", active: "document-text" },
  Branches: { idle: "location-outline", active: "location" },
  "Data Import": { idle: "cloud-upload-outline", active: "cloud-upload" },
  Menu: { idle: "menu-outline", active: "menu" }
}

export function AppIcon({
  name,
  color,
  size = 24
}: {
  name: IconName
  color: string
  size?: number
}) {
  return <Ionicons name={name} size={size} color={color} />
}
