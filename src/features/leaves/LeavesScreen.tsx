import { useCallback, useEffect, useState } from "react"
import { Alert, Text, View } from "react-native"

import { api, isManagementRole, type User } from "../../api"
import { Button, Card, ChoiceRow, DateField, EmptyState, Field, Heading, Metric, Notice, Page, SectionTitle, SkeletonBlock, SkeletonList, SkeletonMetrics, colors, styles } from "../../ui"

import { messageFrom, moneylessNumber } from "../../shared/common"
import { formatLeaveDays, type LeaveRequest, type LeaveTaken, type LeaveType } from "./leave.types"

export function LeavesScreen({ user }: { user: User }) {
  const canApprove = isManagementRole(user.role)
  const [balances, setBalances] = useState<LeaveTaken[]>([])
  const [totalBalance, setTotalBalance] = useState(0)
  const [types, setTypes] = useState<LeaveType[]>([])
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [leaveTypeId, setLeaveTypeId] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [totalDays, setTotalDays] = useState("")
  const [session, setSession] = useState("FULL")
  const [reason, setReason] = useState("")
  const [actingId, setActingId] = useState("")
  const [candidates, setCandidates] = useState<{ id: string; fullName: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    setError("")
    try {
      const [balanceData, leaveTypes] = await Promise.all([
        api.get<{ totalBalance: number | string; taken: LeaveTaken[] }>("/leaves/balance"),
        api.get<LeaveType[]>("/leaves/types")
      ])
      const balanceRows = balanceData.taken
      setTotalBalance(moneylessNumber(balanceData.totalBalance))
      setBalances(balanceRows)
      setTypes(leaveTypes)
      setLeaveTypeId((current) => current || balanceRows[0]?.leaveTypeId || "")
      setCandidates(await api.get('/leaves/acting-candidates'))
      if (canApprove) {
        setRequests(await api.get<LeaveRequest[]>("/leaves/requests"))
      } else {
        setRequests(await api.get<LeaveRequest[]>("/leaves/my-requests"))
      }
    } catch (loadError) {
      setError(messageFrom(loadError))
    } finally {
      setLoading(false)
    }
  }, [canApprove])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async () => {
    setError("")
    setNotice("")
    const days = Number(totalDays)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/
    if (
    !leaveTypeId ||
    !datePattern.test(startDate) ||
    !datePattern.test(endDate) ||
    endDate < startDate ||
    (session === "FULL" && (!Number.isFinite(days) || days <= 0)) ||
    !reason.trim()
    ) {
    setError("Choose a leave type, valid date range, positive number of days, and provide a reason.")
    return
    }
    setSaving(true)
    try {
      await api.post("/leaves/request", {
        leaveTypeId,
        startDate,
        endDate,
        totalDays: session === "FULL" ? days : undefined,
        session,
        reason: reason.trim(),
        actingEmployeeId: actingId || null
      })
      setNotice("Leave request submitted.")
      setStartDate("")
      setEndDate("")
      setTotalDays("")
      setReason("")
      setActingId("")
      await load()
    } catch (submitError) {
      setError(messageFrom(submitError))
    } finally {
      setSaving(false)
    }
  }

  const decide = (request: LeaveRequest, status: "APPROVED" | "REJECTED") => {
    Alert.alert(
      `Are you sure you want to ${status} this request?`,
      undefined,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: status === "APPROVED" ? "Approve" : "Reject",
          style: status === "REJECTED" ? "destructive" : "default",
          onPress: () => {
            setError("")
            void api
              .patch(`/leaves/${request.id}/approve`, { status })
              .then(async () => {
                setNotice(`Leave request ${status.toLowerCase()}.`)
                await load()
              })
              .catch((decisionError) => setError(messageFrom(decisionError)))
          }
        }
      ]
    )
  }

  return (
    <Page>
      <Heading title="Leaves" subtitle="Check your balance, request time off, and track approvals." />
      {error ? <Notice>{error}</Notice> : null}
      {notice ? <Notice tone="success">{notice}</Notice> : null}
      {loading ? (
        <SkeletonMetrics count={3} />
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <Metric
            label="Total leave balance"
            value={formatLeaveDays(totalBalance)}
            tint="blue"
          />
          {balances.map((balance) => (
            <Metric
              key={balance.leaveTypeId}
              label={`${balance.leaveType} taken`}
              value={formatLeaveDays(balance.taken)}
              tint="orange"
            />
          ))}
        </View>
      )}
      <Card>
        <Heading title="Request leave" subtitle="Submit dates, duration and reason for review." />
        <Text style={styles.label}>Leave type</Text>
        {loading ? (
          <SkeletonBlock height={42} radius={12} />
        ) : (
          <ChoiceRow
            options={(types.length ? types : balances.map((balance) => ({
            id: balance.leaveTypeId,
            name: balance.leaveType
          }))).map((leaveType) => ({
            value: leaveType.id,
            label: leaveType.name
          }))}
          value={leaveTypeId}
          onChange={setLeaveTypeId}
          />
        )}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <DateField
              label="Start Date"
              value={startDate}
              onChangeText={setStartDate}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DateField
              label="End Date"
              value={endDate}
              onChangeText={setEndDate}
            />
          </View>
        </View>
        {session === "FULL" ? (
          <Field
            label="Total days"
            value={totalDays}
            onChangeText={setTotalDays}
            keyboardType="numeric"
            placeholder="1"
          />
        ) : (
          <Text style={styles.muted}>Counts as: {formatLeaveDays(session === "SHORT" ? 0.25 : 0.5)}</Text>
        )}
        <Text style={styles.label}>Session</Text>
        <ChoiceRow
          value={session}
          onChange={setSession}
          options={[
            { label: "Full Day", value: "FULL" },
            { label: "Short", value: "SHORT" },
            { label: "Morning Half", value: "MORNING" },
            { label: "Evening Half", value: "AFTERNOON" }
          ]}
        />
        <Text style={styles.label}>Acting person (optional)</Text>
        <ChoiceRow
          value={actingId}
          onChange={setActingId}
          options={[{ label: "None", value: "" }, ...candidates.map((c) => ({ label: c.fullName, value: c.id }))]}
        />
        <Field
          label="Reason"
          value={reason}
          onChangeText={setReason}
          placeholder="Add context for your manager"
          multiline
        />
        <Button title="Submit leave request" onPress={() => void submit()} loading={saving} />
      </Card>
      {(
        <Card>
          <SectionTitle title={canApprove ? "Leave requests" : "My leave requests"} />
          {loading ? (
            <SkeletonList rows={3} />
          ) : requests.length === 0 ? (
            <EmptyState>No leave requests found.</EmptyState>
          ) : (
            requests.map((request) => (
              <View
                key={request.id}
                style={{
                  borderTopColor: colors.line,
                  borderTopWidth: 1,
                  paddingTop: 13,
                  gap: 6
                }}
              >
                {canApprove ? <Text style={{ color: colors.ink, fontWeight: "800" }}>
                  {request.employee?.fullName ?? "Employee"}
                  {request.employee?.employeeCode ? ` · ${request.employee.employeeCode}` : ""}
                </Text> : null}
                <Text style={styles.muted}>
                  {request.leaveType?.name ?? "Leave"} · {request.startDate} to {request.endDate} · {formatLeaveDays(request.totalDays)}
                </Text>
                <Text style={styles.muted}>
                  Status: {request.status}{request.session ? ` · ${request.session.toLowerCase()}` : ""}
                </Text>
                {request.reason ? <Text style={styles.muted}>Reason: {request.reason}</Text> : null}
                {request.actingEmployee?.fullName ? <Text style={styles.muted}>Acting: {request.actingEmployee.fullName}</Text> : null}
                {canApprove && request.status === "PENDING" ? (
                  <View style={{ flexDirection: "row", gap: 9 }}>
                    <View style={{ flex: 1 }}>
                      <Button
                        title="Approve"
                        variant="success"
                        compact
                        onPress={() => void decide(request, "APPROVED")}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        title="Reject"
                        variant="danger"
                        compact
                        onPress={() => void decide(request, "REJECTED")}
                      />
                    </View>
                  </View>
                ) : null}
              </View>
            ))
          )}
        </Card>
      )}
    </Page>
  )
}
