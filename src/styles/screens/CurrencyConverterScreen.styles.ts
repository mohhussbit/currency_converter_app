import { Spacing } from "@/constants/Spacing";
import { Platform, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.md,
    ...(Platform.OS === "web" && {
      maxWidth: 560,
      width: "100%",
      marginHorizontal: "auto",
    }),
  },
  mainContent: {
    flex: 1,
    minHeight: 0,
    gap: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  headerTextBlock: {
    flex: 1,
    gap: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  currencyPanel: {
    borderWidth: 1,
    borderRadius: Spacing.borderRadius.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
    flexShrink: 1,
    minHeight: 0,
  },
  currencyPanelCompact: {
    padding: 8,
     
    gap: 6,
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
    gap: 8,
    flexShrink: 1,
  },
  currencyRow: {
    borderWidth: 1,
    borderRadius: Spacing.borderRadius.sm,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    gap: Spacing.xs,
    minHeight: 46,
  },
  swipeActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginRight: 6,
  },
  swipeDeleteAction: {
    width: 44,
    borderRadius: Spacing.borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
    backgroundColor: "#b42318",
  },
  swipeDeleteActionCompact: {
    width: 40,
  },
  swipeFavoriteAction: {
    width: 40,
    borderRadius: Spacing.borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#5a6472",
  },
  swipeFavoriteActionActive: {
    backgroundColor: "#eaaa08",
  },
  swipeFavoriteActionCompact: {
    width: 36,
  },
  swipeHint: {
    width: 8,
    marginRight: 2,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },
  swipeHintDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#7f7f7f",
  },
  swipeHintDotActive: {
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  currencyRowCompact: {
    minHeight: 40,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  currencyCodeButton: {
    minWidth: 84,
    maxWidth: 102,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  currencyCodeButtonCompact: {
    minWidth: 78,
    maxWidth: 92,
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
    minHeight: 38,
  },
  valueFieldButtonCompact: {
    minHeight: 34,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  addCurrencyButton: {
    marginTop: 4,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: Spacing.borderRadius.sm,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
  },
  addCurrencyButtonCompact: {
    paddingVertical: 6,
  },
  keypadContainer: {
    borderWidth: 1,
    borderRadius: Spacing.borderRadius.md,
    padding: 8,
    gap: 6,
    marginTop: "auto",
  },
  pendingOperationText: {
    textAlign: "right",
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  keypadRow: {
    flexDirection: "row",
    gap: 5,
  },
  keypadButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: Spacing.borderRadius.sm,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  operatorKey: {
    backgroundColor: "#069140",
  },
  actionKey: {
    opacity: 0.9,
  },
});
