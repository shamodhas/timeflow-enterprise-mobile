import type { User } from "../../api"
import { Page } from "../../ui"
import { BranchesPanel } from "./BranchesPanel"
import { EmployeesPanel } from "./EmployeesPanel"
import { ImportPanel } from "./ImportPanel"
import { ManagementAttendancePanel } from "./ManagementAttendancePanel"

export function ManagementScreen({
  user,
  section
}: {
  user: User
  section: "Employees" | "All Attendance" | "Branches" | "Data Import"
}) {
  if (section === "Data Import" && user.role !== "SUPER_ADMIN") return null

  return (
    <Page>
      {section === "Employees" ? <EmployeesPanel user={user} /> : null}
      {section === "All Attendance" ? <ManagementAttendancePanel /> : null}
      {section === "Branches" ? <BranchesPanel /> : null}
      {section === "Data Import" && user.role === "SUPER_ADMIN" ? <ImportPanel /> : null}
    </Page>
  )
}
