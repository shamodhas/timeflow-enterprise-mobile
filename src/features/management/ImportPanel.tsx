import { useState } from "react"
import { Pressable, Text, View } from "react-native"

import * as DocumentPicker from "expo-document-picker"
import * as FileSystem from "expo-file-system/legacy"

import { api } from "../../api"
import { Button, Card, EmptyState, Field, Heading, Notice, SectionTitle, colors, styles } from "../../ui"

import { messageFrom } from "../../shared/common"

type ImportKind = "employees" | "attendance" | "leaves"
type ImportRow = { values: Record<string, string>; _missing: string[] }

const importRequirements: Record<ImportKind, string[]> = {
  employees: ["employeeCode", "fullName", "email", "password", "role"],
  attendance: ["employeeCode", "clockIn", "clockOut", "status"],
  leaves: [
    "employeeCode",
    "leaveTypeName",
    "startDate",
    "endDate",
    "totalDays",
    "status"
  ]
}

const importHeaders: Record<ImportKind, string[]> = {
  employees: ["employeeCode", "fullName", "email", "password", "role"],
  attendance: ["employeeCode", "clockIn", "clockOut", "status"],
  leaves: [
    "employeeCode",
    "leaveTypeName",
    "startDate",
    "endDate",
    "totalDays",
    "status",
    "reason"
  ]
}

const importLabels: Record<ImportKind, string> = {
  employees: "Employees Sheet",
  attendance: "Attendance Sheet",
  leaves: "Leaves Sheet"
}

function parseCsv(content: string, requiredFields: string[]): ImportRow[] {
  const matrix: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    if (char === '"') {
      if (quoted && content[index + 1] === '"') {
        cell += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (char === "," && !quoted) {
      row.push(cell)
      cell = ""
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && content[index + 1] === "\n") index += 1
      row.push(cell)
      if (row.some((value) => value.trim())) matrix.push(row)
      row = []
      cell = ""
    } else {
      cell += char
    }
  }
  if (quoted) throw new Error("CSV has an unclosed quoted field.")
  row.push(cell)
  if (row.some((value) => value.trim())) matrix.push(row)
  if (!matrix.length) return []

  const headers = matrix[0].map((header) => header.trim())
  return matrix.slice(1).map((values) => {
    const fields: Record<string, string> = Object.fromEntries(
      requiredFields.map((field) => [field, ""])
    )
    headers.forEach((header, index) => {
      if (header) fields[header] = (values[index] ?? "").trim()
    })
    return { values: fields, _missing: [] }
  })
}

export function ImportPanel() {
  const [kind, setKind] = useState<ImportKind>("employees")
  const [fileName, setFileName] = useState("")
  const [rows, setRows] = useState<ImportRow[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const required = importRequirements[kind]
  const headers = importHeaders[kind]
  const validateRows = (records: ImportRow[]) =>
    records.map((record) => ({
      ...record,
      _missing: required.filter((field) => !record.values[field]?.trim())
    }))
  const invalidCount = rows.filter((row) => row._missing?.length).length
  const updateCell = (rowIndex: number, key: string, value: string) => {
    setRows((current) =>
      current.map((row, index) => {
        if (index !== rowIndex) return row
        const values = { ...row.values, [key]: value }
        return {
          values,
          _missing: required.filter((field) => !values[field]?.trim())
        }
      })
    )
  }

  const chooseFile = async () => {
    setError("")
    setNotice("")
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "public.comma-separated-values-text"],
        copyToCacheDirectory: true,
        multiple: false
      })
      if (result.canceled || !result.assets[0]) return
      const asset = result.assets[0]
      if (!asset.name.toLowerCase().endsWith(".csv")) {
        setError("Choose a .csv file.")
        return
      }
      const content = await FileSystem.readAsStringAsync(asset.uri)
      const parsed = validateRows(parseCsv(content, required))
      setRows(parsed)
      setFileName(asset.name)
      setNotice(`Loaded ${parsed.length} row(s).`)
    } catch (pickerError) {
      setError(messageFrom(pickerError))
    }
  }

  const importRows = async () => {
    if (!rows.length) {
      setError("Choose a CSV file with at least one data row.")
      return
    }
    if (invalidCount) {
      setError(`Fix the ${invalidCount} incomplete row(s) in the CSV before importing.`)
      return
    }
    setBusy(true)
    setError("")
    setNotice("")
    try {
      const cleanRows = rows.map((row) => row.values)
      const endpoint = {
        employees: "/import/employees",
        attendance: "/import/attendance",
        leaves: "/import/leaves"
      }[kind]
      const key = {
        employees: "employees",
        attendance: "attendanceLogs",
        leaves: "leaveRecords"
      }[kind]
      const result = await api.post<{ message?: string }>(endpoint, {
        [key]: cleanRows
      })
      setRows([])
      setFileName("")
      setNotice(result.message ?? "Import completed.")
    } catch (importError) {
      setError(messageFrom(importError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={{ gap: 14 }}>
      <Heading title={`Legacy Data: ${importLabels[kind]}`} />
      {error ? <Notice>{error}</Notice> : null}
      {notice ? <Notice tone="success">{notice}</Notice> : null}
      <Card>
        <Text style={styles.label}>Select Import Module & Required Schema</Text>
        {(["employees", "attendance", "leaves"] as const).map((module) => {
          const selected = kind === module
          const icon = { employees: "👥", attendance: "⏰", leaves: "🌴" }[module]
          return (
            <Pressable
              key={module}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                setKind(module)
                setRows([])
                setFileName("")
                setError("")
                setNotice("")
              }}
              style={{
                borderColor: selected ? colors.primary : colors.line,
                backgroundColor: selected ? colors.primarySoft : colors.surface,
                borderWidth: selected ? 2 : 1,
                borderRadius: 13,
                padding: 13,
                gap: 7
              }}
            >
              <Text style={{ color: selected ? colors.primary : colors.ink, fontSize: 13, fontWeight: "800" }}>
                {icon}  {importLabels[module]}
              </Text>
              <Text style={styles.muted} numberOfLines={2}>
                {importHeaders[module].join(" · ")}
              </Text>
            </Pressable>
          )
        })}
        <Text style={styles.label}>Required Headers</Text>
        <Text style={styles.muted}>{headers.join(", ")}</Text>
        <Button title={fileName ? `Choose another CSV · ${fileName}` : "Choose CSV file"} variant="secondary" onPress={() => void chooseFile()} />
      </Card>
      <Card>
        <SectionTitle title="Data Verification Preview" />
        <Text style={styles.muted}>{rows.length} record(s) ready · {invalidCount} invalid row(s)</Text>
        {invalidCount ? (
          <Notice>{invalidCount} row(s) are missing required values. Edit the fields below before importing.</Notice>
        ) : null}
        {!rows.length ? (
          <EmptyState>Choose a CSV to preview its rows before importing.</EmptyState>
        ) : (
          rows.map((row, index) => (
            <View
              key={`${fileName}-${index}`}
              style={{
                borderTopColor: colors.line,
                borderTopWidth: 1,
                paddingTop: 10,
                gap: 4
              }}
            >
              <Text style={{ color: colors.ink, fontWeight: "800" }}>
                Row {index + 1}{row._missing?.length ? " · Invalid" : ""}
              </Text>
              {Object.entries(row.values).map(([key, value]) => (
                <Field
                  key={key}
                  label={`${key}${required.includes(key) ? " *" : ""}`}
                  value={value}
                  onChangeText={(nextValue) => updateCell(index, key, nextValue)}
                />
              ))}
              {row._missing?.length ? (
                <Text style={{ color: colors.red, fontSize: 12 }}>
                  Missing: {row._missing.join(", ")}
                </Text>
              ) : null}
              <Button
                title="Remove row"
                compact
                variant="secondary"
                onPress={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}
              />
            </View>
          ))
        )}
        <Button
          title={busy ? "Importing..." : `Import ${rows.length} Records`}
          onPress={() => void importRows()}
          loading={busy}
          disabled={!rows.length || invalidCount > 0}
        />
      </Card>
    </View>
  )
}
