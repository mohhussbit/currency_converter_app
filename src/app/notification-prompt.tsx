import React from "react";

import { Pressable, View } from "react-native";

import { router } from "expo-router";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet } from "react-native-unistyles";

import CustomText from "@/components/CustomText";

const NotificationPermission = () => {
  return (
    <View style={styles.screen}>
      {/* Illustration */}
      <View style={styles.iconWrapper}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="bell-ring-outline" size={64} style={styles.bellIcon} />
        </View>
      </View>

      {/* Example Notification */}
      <View style={styles.notificationStack}>
        {/* Back card 1 */}
        <View style={[styles.notificationCard, styles.backCardOne]} />
        <View style={[styles.notificationCard, styles.backCardTwo]} />

        {/* Front card */}
        <View style={[styles.notificationCard]}>
          <View style={styles.notificationLeft}>
            <View style={styles.notificationIcon}>
              <MaterialCommunityIcons name="bell-outline" size={20} color="white" />
            </View>

            <View style={styles.notificationTextContainer}>
              <CustomText style={styles.notificationTitle}>ConverX Alert</CustomText>

              <CustomText style={styles.notificationText}>
                USD to EUR reached your target rate of 0.95!
              </CustomText>
            </View>
          </View>
        </View>
      </View>
      {/* Text */}
      <CustomText style={styles.heading} fontSize={20}>
        Get Helpful Rate Alerts
      </CustomText>

      <CustomText style={styles.description}>
        Get alerts for key market moves, your target rate, and occasional reminders to stay on top
        of things
      </CustomText>

      {/* Badge */}
      <View style={styles.badge}>
        <MaterialCommunityIcons name="shield-check-outline" size={14} style={styles.badgeIcon} />

        <CustomText style={styles.badgeText}>NO SPAM, NO ADS. TURN OFF ANYTIME.</CustomText>
      </View>

      {/* CTA */}
      <Pressable style={styles.button}>
        <CustomText style={styles.buttonText}>Allow Notifications</CustomText>
      </Pressable>

      <Pressable>
        <CustomText style={styles.later} onPress={() => router.replace("/(tabs)")}>
          Maybe Later
        </CustomText>
      </Pressable>
    </View>
  );
};

export default NotificationPermission;

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
    gap: theme.spacing.xl,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    fontFamily: theme.fonts.Bold,
    fontSize: theme.typography.fontSize.h4,
    color: theme.colors.primary,
  },

  closeIcon: {
    color: theme.colors.grey700,
  },

  iconWrapper: {
    alignItems: "center",
    marginTop: theme.spacing.md,
  },

  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 160,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },

  bellIcon: {
    color: theme.colors.onPrimary,
  },

  notificationCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.cardPadding,
    borderRadius: theme.spacing.borderRadius.lg,
    elevation: 3,
    zIndex: 10,
  },

  notificationLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.gap.sm,
    flex: 1,
  },

  notificationIcon: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.iconPadding,
    borderRadius: theme.spacing.borderRadius.round,
  },

  notificationTextContainer: {
    flex: 1,
  },

  notificationTitle: {
    fontFamily: theme.fonts.SemiBold,
    fontSize: theme.typography.fontSize.body,
    color: theme.colors.onSurface,
  },

  notificationText: {
    fontFamily: theme.fonts.Regular,
    fontSize: theme.typography.fontSize.small,
    color: theme.colors.grey600,
  },

  notificationTime: {
    fontSize: theme.typography.fontSize.tiny,
    color: theme.colors.grey500,
    fontFamily: theme.fonts.Medium,
  },

  heading: {
    textAlign: "center",
    fontFamily: theme.fonts.Bold,
    color: theme.colors.onBackground,
  },

  description: {
    textAlign: "center",
    fontSize: theme.typography.fontSize.body,
    color: theme.colors.grey600,
    lineHeight: theme.typography.lineHeight.body,
    paddingHorizontal: theme.spacing.md,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.gap.xs,
    backgroundColor: theme.colors.grey200,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.round,
    alignSelf: "center",
  },

  badgeIcon: {
    color: theme.colors.primary,
  },

  badgeText: {
    fontSize: theme.typography.fontSize.small,
    fontFamily: theme.fonts.Medium,
    color: theme.colors.grey600,
  },

  button: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.buttonPadding * 1.4,
    borderRadius: theme.spacing.borderRadius.round,
    alignItems: "center",
  },

  buttonText: {
    color: theme.colors.onPrimary,
    fontFamily: theme.fonts.Bold,
    fontSize: theme.typography.fontSize.body,
  },

  later: {
    textAlign: "center",
    color: theme.colors.grey600,
    fontSize: theme.typography.fontSize.body,
    fontFamily: theme.fonts.Medium,
  },
  notificationStack: {
    position: "relative",
    //backgroundColor: "red",
    marginLeft: 10,
  },
  backCardOne: {
    backgroundColor: theme.colors.surface,
    elevation: 3,
    height: 95,
    position: "absolute",
    marginTop: -5,
    marginLeft: -5,
    width: "98%",
    zIndex: 2,
  },
  backCardTwo: {
    backgroundColor: theme.colors.surface,
    elevation: 3,
    height: 90,
    position: "absolute",
    marginTop: -10,
    marginLeft: -10,
    width: "95%",
    zIndex: 1,
  },
}));
