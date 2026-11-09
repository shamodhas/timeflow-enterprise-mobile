import type { UserRole } from "../api"

export const roleLabel: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  HR: "HR",
  EMPLOYEE: "Employee"
}

export const messageFrom = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Please try again."

export const moneylessNumber = (value: unknown) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}
