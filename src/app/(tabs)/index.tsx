import React from "react";

import { View } from "react-native";

import { Stack } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import { StyleSheet } from "react-native-unistyles";

import CustomText from "@/components/CustomText";
import { APP_NAME } from "@/constants";
import { Colors } from "@/constants/Colors";

const index = () => {
  return (
    <View>
      <Stack.Screen
        options={{
          headerTitle: () => null,
          headerLeft: () => (
            <View style={styles.appNameContainer}>
              <View style={styles.swapIconContainer}>
                <Ionicons name="swap-horizontal" size={24} color="white" />
              </View>
              <CustomText style={styles.appName}>{APP_NAME}</CustomText>
            </View>
          ),
          headerRight: () => (
            <View style={styles.headerRightContainer}>
              <View style={styles.timeStampContainer}>
                <CustomText style={styles.title}>LAST UPDATE</CustomText>
                <CustomText style={styles.dateText}>OCT 24, 10:45</CustomText>
              </View>
              <Ionicons name="refresh" size={24} color={Colors.tertiary} />
            </View>
          ),
        }}
      />
    </View>
  );
};

export default index;

const styles = StyleSheet.create((theme) => ({
  appNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.gap.sm,
    marginLeft: 16,
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
  headerRightContainer: {
    marginRight: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.gap.lg,
  },
  timeStampContainer: {},
  title: {
    fontFamily: theme.fonts.SemiBold,
    fontSize: theme.typography.fontSize.tiny,
    color: theme.colors.tertiary,
  },
  dateText: {
    fontFamily: theme.fonts.SemiBold,
    fontSize: theme.typography.fontSize.tiny,
  },
}));
