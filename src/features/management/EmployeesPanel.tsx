import { useCallback, useEffect, useState } from "react"
import { Alert, Pressable, Text, View } from "react-native"

import { api, type User, type UserRole } from "../../api"
import { Button, Card, ChoiceRow, DateField, EmptyState, Field, Heading, Metric, Notice, SectionTitle, SkeletonCard, SkeletonList, SkeletonMetrics, colors, styles } from "../../ui"

import { formatDate, formatTime } from "../attendance/attendance.utils"
import type { AttendanceLog } from "../attendance/attendance.types"
import { formatLeaveDays, type LeaveBalance, type LeaveRequest, type LeaveType } from "../leaves/leave.types"
import { messageFrom, moneylessNumber, roleLabel } from "../../shared/common"

type Employee = {
  id: string
  employeeCode: string
  fullName: string
  email: string
  role: UserRole
  departmentId?: string | null
  department?: { name: string } | null
  status?: string
  createdAt?: string
}

type Department = { id: string; name: string }

function EmployeeLeaveDetailsPanel({
  employee,
  onClose
}: {
  employee: Employee
  onClose: () => void
}) {
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [types, setTypes] = useState<LeaveType[]>([])
  const [attendance, setAttendance] = useState<AttendanceLog[]>([])
  const [workingHours, setWorkingHours] = useState(0)
  const [leaveTypeId, setLeaveTypeId] = useState("")
  const [amount, setAmount] = useState("")
  const [adjustmentType, setAdjustmentType] = useState<"ADD" | "DEDUCT">("ADD")
  const [reason, setReason] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [adjustmentOpen, setAdjustmentOpen] = useState(false)

  const load = useCallback(async () => {
    setError("")
    try {
      const attendanceQuery =
        startDate && endDate
          ? `?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
          : ""
      const [details, leaveTypes, attendanceDetails] = await Promise.all([
        api.get<{ balances: LeaveBalance[]; requests: LeaveRequest[] }>(
          `/leaves/employee/${employee.id}`
        ),
        api.get<LeaveType[]>("/leaves/types"),
        api.get<{
          attendanceRecords: AttendanceLog[]
          currentWeekHours: number
        }>(`/attendance/employee/${employee.id}${attendanceQuery}`)
      ])
      setBalances(details.balances)
      setRequests(details.requests)
      setTypes(leaveTypes)
      setAttendance(attendanceDetails.attendanceRecords)
      setWorkingHours(moneylessNumber(attendanceDetails.currentWeekHours))
      setLeaveTypeId((current) => current || leaveTypes[0]?.id || "")
    } catch (loadError) {
      setError(messageFrom(loadError))
    } finally {
      setLoading(false)
    }
  }, [employee.id, startDate, endDate])

  useEffect(() => {
    void load()
  }, [load])

  const adjust = async () => {
    const value = Number(amount)
    if (
      !leaveTypeId ||
      !Number.isFinite(value) ||
      value <= 0 ||
      reason.trim().length < 5
    ) {
      setError("Choose a leave type, enter a positive number of days, and provide a reason of at least 5 characters.")
      return
    }
    setBusy(true)
    setError("")
    try {
      await api.post(`/leaves/employee/${employee.id}/adjust`, {
        leaveTypeId,
        amount: value,
        adjustmentType,
        reason: reason.trim()
      })
      setAmount("")
      setReason("")
      setNotice("Leave balance adjusted successfully!")
      setAdjustmentOpen(false)
      await load()
    } catch (adjustError) {
      setError(messageFrom(adjustError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card style={{ borderColor: colors.primaryBorder }}>
      <SectionTitle
        title={employee.fullName}
        action={
          <Pressable
            onPress={() => setAdjustmentOpen((open) => !open)}
            accessibilityRole="button"
          >
            <Text style={{ color: colors.primary, fontWeight: "800" }}>
              {adjustmentOpen ? "Close" : "+ Adjust Leaves"}
            </Text>
          </Pressable>
        }
      />
      <Text style={styles.muted}>
        {employee.employeeCode} · {employee.email} · {roleLabel[employee.role]}
      </Text>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        style={{ alignSelf: "flex-start", paddingVertical: 5 }}
      >
        <Text style={{ color: colors.primary, fontSize: 13, fontWeight: "700" }}>
          ← Back to Employees
        </Text>
      </Pressable>
      {error ? <Notice>{error}</Notice> : null}
      {notice ? <Notice tone="success">{notice}</Notice> : null}
      {loading ? (
        <>
          <SkeletonMetrics count={3} />
          <SkeletonCard rows={4} />
          <SkeletonCard rows={3} />
        </>
      ) : (
        <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {balances.map((balance) => (
          <Metric
            key={balance.leaveTypeId}
            label={balance.leaveType}
            value={formatLeaveDays(balance.balance)}
          />
        ))}
      </View>
      {adjustmentOpen ? (
        <View style={{ gap: 12 }}>
          <Text style={styles.label}>Adjust leave balance</Text>
          <ChoiceRow
            value={leaveTypeId}
            onChange={setLeaveTypeId}
            options={types.map((type) => ({ label: type.name, value: type.id }))}
          />
          <ChoiceRow
            value={adjustmentType}
            onChange={(value) => setAdjustmentType(value as "ADD" | "DEDUCT")}
            options={[
              { label: "Add days", value: "ADD" },
              { label: "Deduct days", value: "DEDUCT" }
            ]}
          />
          <Field label="Days" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <Field
            label="Reason (required, at least 5 characters)"
            value={reason}
            onChangeText={setReason}
            placeholder="Explain this balance adjustment"
            multiline
          />
          <Button title="Save adjustment" onPress={() => void adjust()} loading={busy} />
        </View>
      ) : null}
      <SectionTitle title="Request history" />
      {!requests.length ? <EmptyState>No leave requests found.</EmptyState> : null}
      {requests.map((request) => (
        <View key={request.id} style={{ borderTopColor: colors.line, borderTopWidth: 1, paddingTop: 10, gap: 4 }}>
          <Text style={{ color: colors.ink, fontWeight: "800" }}>{request.leaveType?.name ?? "Leave"} · {request.status}</Text>
          <Text style={styles.muted}>{request.startDate} to {request.endDate} · {formatLeaveDays(request.totalDays)}</Text>
          {request.reason ? (
            <Text style={styles.muted} numberOfLines={2}>Reason: {request.reason}</Text>
          ) : null}
        </View>
      ))}
      <SectionTitle title="Attendance & working hours" />
      <Text style={styles.muted}>Working hours in selected period: {workingHours} hrs</Text>
      <View style={{ flexDirection: "row", gap: 9 }}>
        <View style={{ flex: 1 }}>
          <DateField label="From" value={startDate} onChangeText={setStartDate} />
        </View>
        <View style={{ flex: 1 }}>
          <DateField label="To" value={endDate} onChangeText={setEndDate} />
        </View>
      </View>
      {(startDate || endDate) ? (
        <Button
          title="Reset to current week"
          compact
          variant="secondary"
          onPress={() => {
            setStartDate("")
            setEndDate("")
          }}
        />
      ) : null}
      {!attendance.length ? (
        <EmptyState>No attendance records for this period.</EmptyState>
      ) : (
        attendance.map((record) => (
          <View key={record.id} style={{ borderTopColor: colors.line, borderTopWidth: 1, paddingTop: 9, gap: 4 }}>
            <Text style={{ color: colors.ink, fontWeight: "800" }}>
              {formatDate(record.createdAt ?? record.clockIn)}
            </Text>
            <Text style={styles.muted}>
              {formatTime(record.clockIn)} → {formatTime(record.clockOut)} · {record.status ?? "PRESENT"}
            </Text>
          </View>
        ))
      )}
        </>
      )}
    </Card>
  )
}

export function EmployeesPanel({ user }: { user: User }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [pending, setPending] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [view, setView] = useState<"ACTIVE" | "PENDING">("ACTIVE")
  const [editing, setEditing] = useState<Employee | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [inviteRole, setInviteRole] = useState<Exclude<UserRole, "SUPER_ADMIN">>("EMPLOYEE")
  const [inviteNotice, setInviteNotice] = useState("")
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRole>("EMPLOYEE")
  const [departmentId, setDepartmentId] = useState("")
  const [initialLeaves, setInitialLeaves] = useState<Record<string, string>>({})
  const [newDepartment, setNewDepartment] = useState("")
  const [leaveEmployee, setLeaveEmployee] = useState<Employee | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const canManageStatus = user.role !== "HR"
  const canDelete = user.role === "ADMIN" || user.role === "SUPER_ADMIN"

  const load = useCallback(async () => {
    setError("")
    try {
      const [employeeRows, pendingRows, departmentRows, leaveTypeRows] = await Promise.all([
        api.get<Employee[]>("/employees"),
        api.get<Employee[]>("/employees/pending"),
        api.get<Department[]>("/departments"),
        api.get<LeaveType[]>("/leaves/types")
      ])
      setEmployees(employeeRows)
      setPending(pendingRows)
      setDepartments(departmentRows)
      setLeaveTypes(leaveTypeRows)
    } catch (loadError) {
      setError(messageFrom(loadError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const resetForm = () => {
    setEditing(null)
    setCode("")
    setName("")
    setEmail("")
    setPassword("")
    setRole("EMPLOYEE")
    setDepartmentId("")
    setInitialLeaves({})
    setShowForm(false)
  }

  const beginEdit = (employee: Employee) => {
    setEditing(employee)
    setCode(employee.employeeCode)
    setName(employee.fullName)
    setEmail(employee.email)
    setPassword("")
    setRole(employee.role)
    setDepartmentId(employee.departmentId ?? "")
    setInitialLeaves({})
    setShowForm(true)
  }

  const saveEmployee = async () => {
    setError("")
    setBusy(true)
    try {
      const payload = {
        employeeCode: code.trim(),
        fullName: name.trim(),
        email: email.trim(),
        role,
        departmentId: departmentId || null
      }
      if (editing) {
        await api.put(`/employees/${editing.id}`, payload)
      } else {
        if (password.length < 8) {
          setError("Set an initial password of at least 8 characters.")
          return
        }
        const initialAmounts = Object.fromEntries(
          Object.entries(initialLeaves)
            .filter(([, value]) => value.trim() && Number(value) > 0)
            .map(([typeId, value]) => [typeId, Number(value)])
        )
        await api.post("/employees", {
          ...payload,
          password,
          initialLeaves: initialAmounts
        })
      }
      resetForm()
      await load()
    } catch (saveError) {
      setError(messageFrom(saveError))
    } finally {
      setBusy(false)
    }
  }

  const changeStatus = (employee: Employee, status: "ACTIVE" | "REJECTED") => {
    Alert.alert(
      `${status === "ACTIVE" ? "Approve" : "Reject"} account request`,
      `Are you sure you want to ${status.toLowerCase()} ${employee.fullName}'s request?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: status === "ACTIVE" ? "Approve" : "Reject",
          style: status === "REJECTED" ? "destructive" : "default",
          onPress: () => {
            void api
              .patch(`/employees/${employee.id}/status`, { status })
              .then(load)
              .catch((statusError) => setError(messageFrom(statusError)))
          }
        }
      ]
    )
  }

  const deleteEmployee = (employee: Employee) => {
    Alert.alert(
      "Delete employee",
      `Delete ${employee.fullName}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void api
              .delete(`/employees/${employee.id}`)
              .then(load)
              .catch((deleteError) => setError(messageFrom(deleteError)))
          }
        }
      ]
    )
  }

  const createDepartment = async () => {
    if (!newDepartment.trim()) return
    setError("")
    setBusy(true)
    try {
      const department = await api.post<Department>("/departments", {
        name: newDepartment.trim()
      })
      setDepartments((current) => [...current, department])
      setDepartmentId(department.id)
      setNewDepartment("")
    } catch (departmentError) {
      setError(messageFrom(departmentError))
    } finally {
      setBusy(false)
    }
  }

  const sendInvite = async () => {
    setError("")
    setInviteNotice("")
    if (!inviteName.trim() || !inviteEmail.trim() || !inviteCode.trim()) {
      setError("Enter a full name, email address, and employee code.")
      return
    }
    setBusy(true)
    try {
      await api.post("/employees/invite", {
        fullName: inviteName.trim(),
        email: inviteEmail.trim(),
        employeeCode: inviteCode.trim(),
        role: inviteRole
      })
      setInviteName("")
      setInviteEmail("")
      setInviteCode("")
      setInviteRole("EMPLOYEE")
      setShowInvite(false)
      setInviteNotice("Invitation email sent successfully!")
      await load()
    } catch (inviteError) {
      setError(messageFrom(inviteError))
    } finally {
      setBusy(false)
    }
  }

  const shown = view === "ACTIVE" ? employees : pending

  if (leaveEmployee) {
    return (
      <View style={{ gap: 14 }}>
        <EmployeeLeaveDetailsPanel
          employee={leaveEmployee}
          onClose={() => setLeaveEmployee(null)}
        />
      </View>
    )
  }

  return (
    <View style={{ gap: 14 }}>
      <Heading title="Employee Management" />
      {error ? <Notice>{error}</Notice> : null}
      {inviteNotice ? <Notice tone="success">{inviteNotice}</Notice> : null}
      <ChoiceRow
        value={view}
        onChange={(value) => setView(value as "ACTIVE" | "PENDING")}
        options={[
          { label: `Employees (${employees.length})`, value: "ACTIVE" },
          { label: `Pending (${pending.length})`, value: "PENDING" }
        ]}
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            title={showForm ? "Close form" : "+ Add Employee"}
            onPress={() => {
              if (showForm) resetForm()
              else {
                setShowInvite(false)
                setShowForm(true)
              }
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title={showInvite ? "Close invite" : "Invite Employee"}
            variant="secondary"
            onPress={() => {
              setShowForm(false)
              setShowInvite((open) => !open)
            }}
          />
        </View>
      </View>
      {showInvite ? (
        <Card>
          <Heading title="Invite Employee" subtitle="Send an invitation email to join your TimeFlow team." />
          <Field label="Full Name" value={inviteName} onChangeText={setInviteName} autoCapitalize="words" />
          <Field label="Email Address" value={inviteEmail} onChangeText={setInviteEmail} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Employee Code" value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" />
          <Text style={styles.label}>Role</Text>
          <ChoiceRow
            value={inviteRole}
            onChange={(value) => setInviteRole(value as Exclude<UserRole, "SUPER_ADMIN">)}
            options={[
              { label: "Employee", value: "EMPLOYEE" },
              { label: "HR", value: "HR" },
              { label: "Admin", value: "ADMIN" }
            ]}
          />
          <Button
            title={busy ? "Sending Invite..." : "Send Invitation"}
            onPress={() => void sendInvite()}
            loading={busy}
            disabled={!inviteName.trim() || !inviteEmail.trim() || !inviteCode.trim()}
          />
        </Card>
      ) : null}
      {showForm ? (
        <Card>
          <Heading title={editing ? "Edit employee" : "Create employee"} />
          <Field label="Employee code" value={code} onChangeText={setCode} autoCapitalize="characters" />
          <Field label="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          {!editing ? (
            <Field label="Initial password" value={password} onChangeText={setPassword} secureTextEntry />
          ) : null}
          <Text style={styles.label}>Role</Text>
          <ChoiceRow
            value={role}
            onChange={(value) => setRole(value as UserRole)}
            options={[
              { label: "Employee", value: "EMPLOYEE" },
              { label: "HR", value: "HR" },
              { label: "Admin", value: "ADMIN" },
              ...(editing?.role === "SUPER_ADMIN"
                ? [{ label: "Super Admin", value: "SUPER_ADMIN" }]
                : [])
            ]}
          />
          {!editing ? (
            <>
              <Text style={styles.label}>Initial leave quotas (days)</Text>
              {leaveTypes.map((leaveType) => (
                <Field
                  key={leaveType.id}
                  label={`${leaveType.name} · default ${leaveType.defaultQuota ?? 0}`}
                  value={initialLeaves[leaveType.id] ?? ""}
                  onChangeText={(value) =>
                    setInitialLeaves((current) => ({
                      ...current,
                      [leaveType.id]: value
                    }))
                  }
                  keyboardType="decimal-pad"
                  placeholder={String(leaveType.defaultQuota ?? 0)}
                />
              ))}
            </>
          ) : null}
          <Text style={styles.label}>Department</Text>
          <ChoiceRow
            value={departmentId}
            onChange={setDepartmentId}
            options={[
              { label: "None", value: "" },
              ...departments.map((department) => ({
                label: department.name,
                value: department.id
              }))
            ]}
          />
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
            <View style={{ flex: 1 }}>
              <Field label="New department" value={newDepartment} onChangeText={setNewDepartment} />
            </View>
            <Button title="Add" compact variant="secondary" onPress={() => void createDepartment()} loading={busy} />
          </View>
          <Button
            title={editing ? "Save changes" : "Create employee"}
            onPress={() => void saveEmployee()}
            loading={busy}
            disabled={!code.trim() || !name.trim() || !email.trim()}
          />
          <Button title="Cancel" variant="secondary" onPress={resetForm} />
        </Card>
      ) : null}
      <Card>
        <SectionTitle title={view === "ACTIVE" ? "Employee directory" : "Access requests"} />
        {loading ? (
          <SkeletonList rows={5} />
        ) : !shown.length ? (
          <EmptyState>{view === "ACTIVE" ? "No employees found." : "No pending access requests."}</EmptyState>
        ) : (
          shown.map((employee) => (
            <View
              key={employee.id}
              style={{
                borderTopColor: colors.line,
                borderTopWidth: 1,
                paddingTop: 13,
                gap: 6
              }}
            >
              <Text style={{ color: colors.ink, fontSize: 15, fontWeight: "800" }}>{employee.fullName}</Text>
              <Text style={styles.muted}>
                {employee.employeeCode || "N/A"} · {employee.email}
              </Text>
              <Text style={styles.muted}>
                {view === "PENDING" ? "Requested Role: " : "Role: "}
                {roleLabel[employee.role]}
                {employee.department?.name ? ` · ${employee.department.name}` : view === "ACTIVE" ? " · Department: N/A" : ""}
              </Text>
              {view === "PENDING" ? (
                <Text style={styles.muted}>
                  Date: {employee.createdAt ? new Date(employee.createdAt).toLocaleDateString("en-LK") : "N/A"}
                </Text>
              ) : null}
              {view === "PENDING" && canManageStatus ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Button title="Approve" compact variant="success" onPress={() => changeStatus(employee, "ACTIVE")} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button title="Reject" compact variant="danger" onPress={() => changeStatus(employee, "REJECTED")} />
                  </View>
                </View>
              ) : view === "ACTIVE" ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Button title="Edit" compact variant="secondary" onPress={() => beginEdit(employee)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button title="Leaves" compact variant="secondary" onPress={() => setLeaveEmployee(employee)} />
                  </View>
                  {canDelete ? (
                    <View style={{ flex: 1 }}>
                      <Button title="Delete" compact variant="danger" onPress={() => deleteEmployee(employee)} />
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))
        )}
      </Card>
    </View>
  )
}
