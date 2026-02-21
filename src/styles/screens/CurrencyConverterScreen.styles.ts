import { Spacing } from "@/constants/Spacing";
import { Platform, StyleSheet } from "react-native";
import { Colors } from "@/constants/Colors";

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
    position: "relative",
    overflow: "hidden",
  },
  currencyPanelGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  currencyPanelSheen: {
    ...StyleSheet.absoluteFillObject,
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
    position: "relative",
    overflow: "hidden",
  },
  currencyRowGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  currencyRowSheen: {
    ...StyleSheet.absoluteFillObject,
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
    backgroundColor: Colors.primary,
  },
  swipeDeleteActionCompact: {
    width: 40,
  },
  swipeFavoriteAction: {
    width: 40,
    borderRadius: Spacing.borderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.secondary,
  },
  swipeFavoriteActionActive: {
    backgroundColor: Colors.accent,
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
    backgroundColor: "rgba(157, 217, 210, 0.55)",
  },
  swipeHintDotActive: {
    backgroundColor: "rgba(255, 248, 240, 0.88)",
  },
  currencyRowCompact: {
    minHeight: 40,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  currencyCodeButton: {
    minWidth: 84,
    maxWidth: 102,
    flexShrink: 0,
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
    minWidth: 0,
    borderWidth: 1,
    borderRadius: Spacing.borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: "center",
    minHeight: 38,
    overflow: "hidden",
    position: "relative",
  },
  valueFieldButtonGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  valueFieldButtonSheen: {
    ...StyleSheet.absoluteFillObject,
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
    overflow: "hidden",
    position: "relative",
  },
  addCurrencyButtonGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  addCurrencyButtonSheen: {
    ...StyleSheet.absoluteFillObject,
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
    position: "relative",
    overflow: "hidden",
  },
  keypadContainerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  keypadContainerSheen: {
    ...StyleSheet.absoluteFillObject,
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
    overflow: "hidden",
  },
  keypadButtonGradient: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  keypadButtonSheen: {
    ...StyleSheet.absoluteFillObject,
  },
  operatorKey: {
    borderColor: `${Colors.primary}AA`,
  },
  actionKey: {
    borderColor: `${Colors.accent}B8`,
  },
});
