import { Spacing } from "@/constants/Spacing";
import { Platform, StyleSheet } from "react-native";
import { Colors } from "@/constants/Colors";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === "web" && {
      maxWidth: 500,
      marginHorizontal: "auto",
      width: "100%",
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing.md,
  },
  headerSide: {
    flex: 1,
    alignItems: "flex-start",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  headerSideRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  headerRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.md,
  },
  summaryCard: {
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.sm,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  retentionWrap: {
    alignItems: "flex-end",
  },
  retentionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Spacing.borderRadius.round,
    backgroundColor: Colors.primary,
  },
  retentionBadgeText: {
    color: Colors.white,
  },
  cleanupMessage: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: Spacing.borderRadius.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  historyList: {
    gap: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  historyItem: {
    padding: Spacing.cardPadding,
    borderRadius: Spacing.borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  historyTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  currencyPair: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  currencyMetaWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  flagContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  flagStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  flag: {
    width: 24,
    height: 24,
    borderRadius: Spacing.borderRadius.round,
  },
  flagOverlap: {
    marginLeft: -Spacing.sm,
  },
  pairPillsWrap: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  currencyColumn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
  pairPill: {
    borderRadius: Spacing.borderRadius.round,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeWrap: {
    alignItems: "flex-end",
    maxWidth: "46%",
    gap: 2,
  },
  valuesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  historyDetails: {
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  valueColumn: {
    flex: 1,
    alignItems: "flex-start",
  },
  valueColumnRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  swapIcon: {
    opacity: 0.85,
  },
  rateChip: {
    borderRadius: Spacing.borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
});
