import { StyleSheet } from "react-native"
import { colors } from "./theme"

const buildStyles = () => StyleSheet.create({
  page: {
    padding: 18,
    paddingBottom: 38,
    gap: 16
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 8,
    elevation: 1
  },
  heading: {
    gap: 5
  },
  headingTitle: {
    color: colors.ink,
    fontSize: 23,
    fontWeight: "800"
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase"
  },
  field: {
    gap: 7
  },
  input: {
    minHeight: 48,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    color: colors.ink,
    backgroundColor: colors.inputBg,
    fontSize: 15
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: "top"
  },
  button: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonCompact: {
    minHeight: 38,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  buttonPrimary: {
    backgroundColor: colors.primary
  },
  buttonSecondary: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder
  },
  buttonDanger: {
    backgroundColor: colors.red
  },
  buttonSuccess: {
    backgroundColor: colors.green
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center"
  },
  buttonTextSecondary: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center"
  },
  buttonDisabled: {
    opacity: 0.55
  },
  buttonPressed: {
    opacity: 0.82
  },
  choiceRow: {
    flexDirection: "row",
    gap: 8
  },
  choice: {
    backgroundColor: colors.inputBg,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  choiceSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryBorder
  },
  choiceText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  choiceTextSelected: {
    color: colors.primary
  },
  metric: {
    minWidth: "47%",
    flexGrow: 1,
    minHeight: 88,
    borderRadius: 12,
    padding: 13,
    gap: 8,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1
  },
  metricValue: {
    fontSize: 25,
    fontWeight: "800",
    lineHeight: 30
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase"
  },
  emptyState: {
    color: colors.muted,
    textAlign: "center",
    padding: 20,
    fontSize: 13,
    lineHeight: 19
  },
  notice: {
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    lineHeight: 19,
    overflow: "hidden"
  },
  noticeError: {
    color: colors.red,
    backgroundColor: colors.redSoft
  },
  noticeSuccess: {
    color: colors.green,
    backgroundColor: colors.greenSoft
  },
  noticeInfo: {
    color: colors.primary,
    backgroundColor: colors.primarySoft
  },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitleText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800"
  },
  skeleton: {
    backgroundColor: colors.skeleton,
    overflow: "hidden"
  },
  skeletonShimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "55%",
    backgroundColor: colors.skeletonShimmer,
    opacity: 0.9
  },
  skeletonMetricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  skeletonMetric: {
    minWidth: "47%",
    flexGrow: 1,
    minHeight: 79,
    padding: 14,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    justifyContent: "center",
    gap: 10
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 18,
    padding: 17,
    gap: 16
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  skeletonListRow: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 12
  }
})

export const styles = buildStyles()

export const refreshStyles = () => {
  Object.assign(styles, buildStyles())
}
