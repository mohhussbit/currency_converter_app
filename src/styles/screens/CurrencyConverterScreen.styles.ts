import { Spacing } from "@/constants/Spacing";
import { Platform, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.sm,
    ...(Platform.OS === "web" && {
      maxWidth: 560,
      width: "100%",
      marginHorizontal: "auto",
    }),
  },
  mainContent: {
    flex: 1,
    minHeight: 0,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  headerTextBlock: {
    flex: 1,
    gap: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  currencyPanel: {
    borderWidth: 1,
    borderRadius: Spacing.borderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
    flexShrink: 1,
    minHeight: 0,
  },
  currencyPanelCompact: {
    padding: 6,
    gap: 4,
  },
  currencyPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  currencyPanelActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  currencyRows: {
    gap: 6,
    flexShrink: 1,
  },
  currencyRow: {
    borderWidth: 1,
    borderRadius: Spacing.borderRadius.sm,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    gap: Spacing.xs,
    minHeight: 42,
  },
  currencyRowCompact: {
    minHeight: 34,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  currencyCodeButton: {
    minWidth: 94,
    maxWidth: 116,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  currencyCodeButtonCompact: {
    minWidth: 84,
    maxWidth: 100,
  },
  flagIcon: {
    width: 24,
    height: 24,
    borderRadius: Spacing.borderRadius.round,
    overflow: "hidden",
  },
  valueFieldButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Spacing.borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: "center",
    minHeight: 34,
  },
  valueFieldButtonCompact: {
    minHeight: 30,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeButton: {
    width: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonCompact: {
    width: 20,
  },
  addCurrencyButton: {
    marginTop: 2,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: Spacing.borderRadius.sm,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
  },
  addCurrencyButtonCompact: {
    paddingVertical: 4,
  },
  keypadContainer: {
    borderWidth: 1,
    borderRadius: Spacing.borderRadius.md,
    padding: 6,
    gap: 4,
    marginTop: "auto",
  },
  keypadContainerCompact: {
    padding: 4,
    gap: 3,
  },
  pendingOperationText: {
    textAlign: "right",
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  keypadRow: {
    flexDirection: "row",
    gap: 4,
  },
  keypadRowCompact: {
    gap: 3,
  },
  keypadButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: Spacing.borderRadius.sm,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  keypadButtonCompact: {
    minHeight: 38,
  },
  operatorKey: {
    backgroundColor: "#069140",
  },
  actionKey: {
    opacity: 0.9,
  },
});
