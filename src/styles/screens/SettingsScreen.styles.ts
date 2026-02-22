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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.md,
  },
  proBanner: {
    backgroundColor: Colors.primary,
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.sm,
    position: "relative",
    overflow: "hidden",
  },
  proBannerGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  proBannerSheen: {
    ...StyleSheet.absoluteFillObject,
  },
  proBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Spacing.borderRadius.round,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  proBadgeText: {
    color: Colors.white,
    letterSpacing: 1,
  },
  proTitle: {
    color: Colors.white,
  },
  proSubtitle: {
    color: "rgba(255, 255, 255, 0.9)",
  },
  featureList: {
    gap: 8,
    marginTop: 6,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    color: Colors.white,
  },
  proButton: {
    marginTop: 6,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Spacing.borderRadius.round,
    backgroundColor: Colors.white,
  },
  proButtonText: {
    color: Colors.primary,
  },
  sectionCard: {
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    position: "relative",
    overflow: "hidden",
  },
  sectionCardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  sectionCardSheen: {
    ...StyleSheet.absoluteFillObject,
  },
  themeChips: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  themeChip: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Spacing.borderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: Spacing.borderRadius.md,
    marginTop: Spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    position: "relative",
    overflow: "hidden",
  },
  actionItemGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  actionItemSheen: {
    ...StyleSheet.absoluteFillObject,
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: Spacing.borderRadius.round,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTextWrap: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    marginBottom: 1,
  },
  actionDescription: {
    lineHeight: 18,
  },
  footer: {
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
    gap: 8,
    alignItems: "center",
  },
  versionText: {
    textAlign: "center",
  },
  policyLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  policyLink: {
    textDecorationLine: "underline",
  },
});
