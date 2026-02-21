import { Spacing } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { Platform, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    ...(Platform.OS === "web" && {
      maxWidth: 500,
      marginHorizontal: "auto",
      width: "100%",
    }),
  },
  modalContent: {
    width: "92%",
    maxHeight: "86%",
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.xl,
    position: "relative",
    overflow: "hidden",
  },
  modalContentGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContentSheen: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    backgroundColor: "transparent",
    paddingHorizontal: Spacing.md,
    height: 52,
    borderRadius: Spacing.borderRadius.md,
    gap: Spacing.gap.xs,
    borderWidth: 1,
    position: "relative",
    overflow: "hidden",
  },
  searchContainerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  searchContainerSheen: {
    ...StyleSheet.absoluteFillObject,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.body,
  },
  clearButton: {},
  currenciesList: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xl,
  },
  helperText: {
    marginBottom: Spacing.md,
  },
  sectionsWrapper: {
    marginBottom: Spacing.md,
  },
  sectionContainer: {
    marginBottom: Spacing.lg,
  },
  sectionList: {
    marginTop: Spacing.sm,
  },
  sectionCurrencyItemWrap: {
    marginBottom: Spacing.sm,
  },
  allCurrenciesLabel: {
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  currencyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Spacing.borderRadius.md,
    minHeight: 62,
    position: "relative",
    overflow: "hidden",
  },
  currencyItemSeparator: {
    height: Spacing.sm,
  },
  flagIcon: {
    width: 30,
    height: 30,
    borderRadius: Spacing.borderRadius.round,
    overflow: "hidden",
  },
  currencyInfo: {
    flex: 1,
    gap: 2,
  },
  emptyState: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
    gap: Spacing.sm,
  },
});
