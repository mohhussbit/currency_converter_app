import React from "react";

import { Pressable, View } from "react-native";

import { router } from "expo-router";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet } from "react-native-unistyles";

import CustomText from "@/components/CustomText";
import { APP_NAME } from "@/constants";

const FEATURES = [
  {
    icon: "trending-up",
    title: "Live Exchange Rates",
    description: "Real-time updates for over 150 currencies",
  },
  {
    icon: "calculator-variant-outline",
    title: "Built-in Calculator",
    description: "Convert amounts instantly as you type",
  },
  {
    icon: "bell-outline",
    title: "Personalized Alerts",
    description: "Get notified when rates hit your target",
  },
];

const Index = () => {
  return (
    <View style={styles.screen}>
      <View style={styles.appNameContainer}>
        <View style={styles.swapIconContainer}>
          <MaterialCommunityIcons name="swap-horizontal" size={24} color="white" />
        </View>
        <CustomText style={styles.appName}>{APP_NAME}</CustomText>
      </View>

      {/* Badge */}
      <View style={styles.badge}>
        <CustomText style={styles.badgeText}>Premium Exchange Experience</CustomText>
      </View>

      {/* Title */}
      <CustomText style={styles.title} fontSize={20}>
        Why keep this App?
      </CustomText>

      {/* Subtitle */}
      <CustomText style={styles.subtitle} fontSize={14}>
        Everything you need to convert money fast, simple and reliable
      </CustomText>

      {/* Features */}
      <View style={styles.featuresContainer}>
        {FEATURES.map((item, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={styles.cardIcon}>
                <MaterialCommunityIcons name={item.icon} size={22} style={styles.iconColor} />
              </View>

              <View>
                <CustomText style={styles.cardTitle}>{item.title}</CustomText>
                <CustomText style={styles.cardDescription}>{item.description}</CustomText>
              </View>
            </View>
          </View>
        ))}
      </View>

      <CustomText style={styles.noSignup}>No signup is required</CustomText>

      <Pressable style={styles.button} onPress={() => router.replace("/notification-prompt")}>
        <CustomText style={styles.buttonText}>Get Started</CustomText>
      </Pressable>
    </View>
  );
};

export default Index;

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    experimental_backgroundImage: `linear-gradient(
    to bottom right,
    ${theme.colors.tertiary} 15%,
    ${theme.colors.grey100} 50%,
    ${theme.colors.tertiary} 90%
  );`,
    paddingTop: rt.insets.top * 1.2,
    paddingHorizontal: theme.spacing.screenPadding,
  },

  appNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.gap.sm,
  },

  swapIconContainer: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.iconPadding,
    borderRadius: theme.spacing.borderRadius.sm,
  },

  appName: {
    color: theme.colors.primary,
    fontFamily: theme.fonts.Bold,
    fontSize: theme.typography.fontSize.h4,
    includeFontPadding: true,
  },

  badge: {
    alignSelf: "center",
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.tertiary,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.spacing.borderRadius.round,
    elevation: 0,
  },

  badgeText: {
    color: theme.colors.primary,
    fontFamily: theme.fonts.Medium,
    fontSize: theme.typography.fontSize.small,
    includeFontPadding: true,
  },

  title: {
    textAlign: "center",
    marginTop: theme.spacing.lg,
    fontFamily: theme.fonts.Bold,
    color: theme.colors.onBackground,
    includeFontPadding: true,
  },

  subtitle: {
    textAlign: "center",
    marginTop: theme.spacing.sm,
    fontFamily: theme.fonts.Regular,
    color: theme.colors.grey600,
    paddingHorizontal: theme.spacing.md,
    lineHeight: theme.typography.lineHeight.body,
    includeFontPadding: true,
  },

  featuresContainer: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.gap.lg,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing.cardPadding,
    borderRadius: theme.spacing.borderRadius.lg,
    backgroundColor: theme.colors.surface,
    elevation: 0,
  },

  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.gap.md,
  },

  cardIcon: {
    padding: theme.spacing.iconPadding,
    backgroundColor: theme.colors.tertiary + "60",
    borderRadius: theme.spacing.borderRadius.md,
  },

  cardTitle: {
    fontFamily: theme.fonts.SemiBold,
    fontSize: theme.typography.fontSize.h5,
    color: theme.colors.onSurface,
    includeFontPadding: true,
  },

  cardDescription: {
    marginTop: theme.spacing.xs,
    fontFamily: theme.fonts.Regular,
    fontSize: theme.typography.fontSize.small,
    color: theme.colors.grey600,
    maxWidth: "90%",
  },

  iconColor: {
    color: theme.colors.primary,
  },

  noSignup: {
    marginTop: "auto",
    textAlign: "center",
    marginBottom: theme.spacing.sm,
    fontFamily: theme.fonts.Regular,
    fontSize: theme.typography.fontSize.small,
    color: theme.colors.grey500,
    includeFontPadding: true,
  },

  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.buttonPadding * 1.3,
    borderRadius: theme.spacing.borderRadius.round,
    alignItems: "center",
    marginBottom: rt.insets.bottom + theme.spacing.sm,
  },

  buttonText: {
    color: theme.colors.onPrimary,
    fontFamily: theme.fonts.Bold,
    fontSize: theme.typography.fontSize.body,
    includeFontPadding: true,
  },
}));
