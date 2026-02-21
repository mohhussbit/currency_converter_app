import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { Typography } from "@/constants/Typography";
import { Platform, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    ...(Platform.OS === "web" && {
      maxWidth: 500,
      marginHorizontal: "auto",
      width: "100%",
    }),
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.screenPadding,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: Spacing.md,
  },
  headerSpacer: {
    width: 24,
  },
  heroCard: {
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.sm,
  },
  sectionCard: {
    borderRadius: Spacing.borderRadius.lg,
    padding: Spacing.cardPadding,
    gap: Spacing.md,
  },
  reportTypeContainer: {
    marginTop: Spacing.xs,
  },
  formContainer: {
    marginTop: Spacing.xs,
  },
  actionsContainer: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  submissionsContainer: {
    marginTop: Spacing.sm,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 2,
  },
  typeChip: {
    borderWidth: 1,
    borderRadius: Spacing.borderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  inputGroup: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.borderRadius.md,
    paddingHorizontal: Spacing.inputPadding,
    paddingVertical: 10,
    fontSize: Typography.fontSize.body,
  },
  textArea: {
    minHeight: 140,
  },
  buttonRow: {
    gap: 12,
    marginTop: 2,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: Spacing.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
  },
  primaryButtonText: {
    color: Colors.white,
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: Spacing.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
  },
  whatsappButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  feedbackCard: {
    borderWidth: 1,
    borderRadius: Spacing.borderRadius.md,
    padding: Spacing.md,
    marginTop: 10,
  },
  feedbackHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  feedbackType: {
    borderWidth: 1,
    borderRadius: Spacing.borderRadius.round,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
