import { Spacing } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { Platform, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    ...(Platform.OS === "web" && {
      maxWidth: 500,
      marginHorizontal: "auto",
      width: "100%",
    }),
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    borderRadius: Spacing.inputBorderRadius,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    backgroundColor: "transparent",
    paddingHorizontal: Spacing.inputPadding,
    height: Spacing.inputHeight,
    borderRadius: Spacing.inputBorderRadius,
    gap: Spacing.gap.xs,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.body,
  },
  clearButton: {},
  currenciesList: {
    paddingBottom: Spacing.lg,
  },
  helperText: {
    marginBottom: Spacing.sm,
  },
  sectionsWrapper: {
    marginBottom: Spacing.sm,
  },
  sectionContainer: {
    marginBottom: Spacing.md,
  },
  sectionList: {
    marginTop: Spacing.xs,
  },
  allCurrenciesLabel: {
    marginBottom: Spacing.xs,
  },
  currencyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    gap: Spacing.sm,
  },
  flagIcon: {
    width: 30,
    height: 30,
    borderRadius: Spacing.borderRadius.round,
    overflow: "hidden",
  },
  currencyInfo: {
    flex: 1,
  },
  emptyState: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
    gap: Spacing.xs,
  },
});
