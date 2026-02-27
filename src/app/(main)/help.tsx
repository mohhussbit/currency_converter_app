import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Platform,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import Constants from "expo-constants";
import { router } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import * as Sentry from "@sentry/react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { getStoredValues, saveSecurely } from "@/store/storage";
import { styles } from "@/styles/screens/HelpScreen.styles";

export type FeedbackType = "Bug Report" | "Feedback" | "Other";

export interface Feedback {
  type: FeedbackType;
  name: string;
  email: string;
  text: string;
  timestamp: number;
  platform: string;
  version?: string;
}

const reportTypes: FeedbackType[] = ["Bug Report", "Feedback", "Other"];
const SUPPORT_WHATSAPP_NUMBER = process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP_NUMBER;

type SubmitMode = "regular" | "whatsapp" | null;

const typeColors: Record<FeedbackType, { active: string; light: string; onActive: string }> = {
  "Bug Report": {
    active: Colors.primary,
    light: "rgba(255, 136, 17, 0.16)",
    onActive: Colors.white,
  },
  Feedback: {
    active: Colors.secondary,
    light: "rgba(157, 217, 210, 0.22)",
    onActive: Colors.black,
  },
  Other: {
    active: Colors.accent,
    light: "rgba(244, 208, 111, 0.22)",
    onActive: Colors.black,
  },
};

const parseStoredFeedbacksSafely = (rawValue: string | null | undefined): Feedback[] => {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? (parsed as Feedback[]) : [];
  } catch (error) {
    console.error("Failed to parse stored feedbacks:", error);
    return [];
  }
};

const submitFeedbackToSentrySafely = async (feedback: Feedback) => {
  try {
    Sentry.setUser({
      email: feedback.email,
      username: feedback.name,
    });

    Sentry.setContext("feedback", {
      type: feedback.type,
      platform: feedback.platform,
      version: feedback.version,
    });

    Sentry.captureFeedback({
      name: feedback.name,
      email: feedback.email,
      message: feedback.text,
      source: "help-screen",
      tags: {
        feedbackType: feedback.type,
        platform: feedback.platform,
        version: feedback.version || "unknown",
      },
    });

    return true;
  } catch (error) {
    console.error("Error submitting feedback to Sentry:", error);
    return false;
  }
};

const openWhatsAppUrlSafely = async (appUrl: string, webUrl: string) => {
  try {
    const canOpenAppUrl = await Linking.canOpenURL(appUrl);
    await Linking.openURL(canOpenAppUrl ? appUrl : webUrl);
    return true;
  } catch (error) {
    console.error("Error opening WhatsApp:", error);
    return false;
  }
};

const HelpScreen = () => {
  const { colors } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const appVersion = Constants.expoConfig?.version || "1.0.0";

  const [selectedType, setSelectedType] = useState<FeedbackType>(reportTypes[0]);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [reportText, setReportText] = useState("");
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [submitMode, setSubmitMode] = useState<SubmitMode>(null);

  const isSubmitting = submitMode !== null;

  const normalizedWhatsappNumber = () => {
    const rawValue = SUPPORT_WHATSAPP_NUMBER?.trim() || "";
    const digitsOnly = rawValue.replace(/[^\d]/g, "");
    return digitsOnly.length >= 8 ? digitsOnly : "";
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      router.back();
      return true;
    });

    return () => backHandler.remove();
  }, []);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  useEffect(() => {
    const stored = getStoredValues(["userFeedbacks"]);
    setFeedbacks(parseStoredFeedbacksSafely(stored.userFeedbacks));
  }, []);

  const saveFeedbackLocally = (feedback: Feedback) => {
    const stored = getStoredValues(["userFeedbacks"]);
    const existing = parseStoredFeedbacksSafely(stored.userFeedbacks);
    const updated = [feedback, ...existing];
    saveSecurely([{ key: "userFeedbacks", value: JSON.stringify(updated) }]);
    setFeedbacks(updated);
    return true;
  };

  const buildWhatsAppMessage = (feedback: Feedback) => {
    const lines = [
      "Support Request",
      `Type: ${feedback.type}`,
      `Name: ${feedback.name}`,
      `Email: ${feedback.email}`,
      `Version: ${feedback.version || "unknown"}`,
      `Platform: ${feedback.platform}`,
      "",
      feedback.text,
    ];

    return lines.join("\n");
  };

  const openWhatsAppForFeedback = async (feedback: Feedback) => {
    const whatsappNumber = normalizedWhatsappNumber();
    if (!whatsappNumber) {
      showAlert(
        "WhatsApp Not Configured",
        "Set EXPO_PUBLIC_SUPPORT_WHATSAPP_NUMBER to enable WhatsApp support.",
      );
      return false;
    }

    const encodedMessage = encodeURIComponent(buildWhatsAppMessage(feedback));
    const appUrl = `whatsapp://send?phone=${whatsappNumber}&text=${encodedMessage}`;
    const webUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    const opened = await openWhatsAppUrlSafely(appUrl, webUrl);
    if (!opened) {
      showAlert(
        "Unable to Open WhatsApp",
        "Please make sure WhatsApp is installed or try again later.",
      );
    }
    return opened;
  };

  const validateForm = () => {
    if (!userName.trim()) {
      showAlert("Error", "Please enter your name.");
      return false;
    }
    if (!userEmail.trim()) {
      showAlert("Error", "Please enter your email address.");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(userEmail)) {
      showAlert("Error", "Please enter a valid email address.");
      return false;
    }
    if (!reportText.trim()) {
      showAlert("Error", "Please describe your issue or feedback.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (mode: Exclude<SubmitMode, null>) => {
    if (!validateForm()) {
      return;
    }

    setSubmitMode(mode);

    const feedback: Feedback = {
      type: selectedType,
      name: userName.trim(),
      email: userEmail.trim(),
      text: reportText.trim(),
      timestamp: Date.now(),
      platform: Platform.OS,
      version: appVersion,
    };

    const sentrySuccess = await submitFeedbackToSentrySafely(feedback);
    const savedLocally = saveFeedbackLocally(feedback);
    if (!savedLocally) {
      showAlert("Error", "An unexpected error occurred while saving your report.");
      setSubmitMode(null);
      return;
    }

    showAlert(
      "Report Submitted",
      sentrySuccess
        ? "Your report was saved and logged for diagnostics."
        : "Your report was saved locally.",
    );

    if (mode === "whatsapp") {
      await openWhatsAppForFeedback(feedback);
    }

    setUserName("");
    setUserEmail("");
    setReportText("");
    setSubmitMode(null);
  };
  const recentFeedbacks = feedbacks.slice(0, 8);
  const handleBack = () => {
    router.back();
  };
  const handleSubmitRegular = () => {
    void handleSubmit("regular");
  };
  const handleSubmitWithWhatsApp = () => {
    void handleSubmit("whatsapp");
  };

  return (
    <View style={styles.gradientWrapper}>
      <KeyboardAwareScrollView
        enableOnAndroid
        enableAutomaticScroll
        style={[styles.container, { backgroundColor: "transparent" }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: top + 10, paddingBottom: bottom + 44 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} activeOpacity={0.8} hitSlop={10}>
              <Ionicons name="arrow-back" size={Spacing.iconSize} color={Colors.primary} />
            </TouchableOpacity>
            <CustomText variant="h4" fontWeight="bold" style={{ color: colors.text }}>
              App Support
            </CustomText>
            <View style={styles.headerSpacer} />
          </View>

          <View style={[styles.heroCard, { backgroundColor: colors.card }]}>
            <CustomText variant="h5" fontWeight="bold" style={{ color: colors.text }}>
              Tell us what happened
            </CustomText>
            <CustomText variant="h6" style={{ color: colors.gray[500] }}>
              Send a report directly from the app. You can also submit through WhatsApp.
            </CustomText>
          </View>

          <View
            style={[
              styles.sectionCard,
              styles.reportTypeContainer,
              { backgroundColor: colors.card },
            ]}
          >
            <CustomText variant="h6" fontWeight="medium" style={{ color: colors.gray[500] }}>
              Report Type
            </CustomText>
            <View style={styles.typeRow}>
              {reportTypes.map((type) => {
                const isSelected = selectedType === type;
                const palette = typeColors[type];

                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeChip,
                      {
                        borderColor: isSelected ? palette.active : `${palette.active}50`,
                        backgroundColor: isSelected ? palette.active : palette.light,
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setSelectedType(type)}
                  >
                    <CustomText
                      variant="h6"
                      fontWeight="medium"
                      style={{ color: isSelected ? palette.onActive : palette.active }}
                    >
                      {type}
                    </CustomText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View
            style={[styles.sectionCard, styles.formContainer, { backgroundColor: colors.card }]}
          >
            <View style={styles.inputGroup}>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Your Name"
                placeholderTextColor={colors.gray[500]}
                value={userName}
                onChangeText={setUserName}
                returnKeyType="next"
              />

              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Your Email"
                placeholderTextColor={colors.gray[500]}
                value={userEmail}
                onChangeText={setUserEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />

              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    color: colors.text,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Describe your issue or feedback..."
                placeholderTextColor={colors.gray[500]}
                value={reportText}
                onChangeText={setReportText}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />

              <CustomText variant="h7" style={{ color: colors.gray[500], textAlign: "right" }}>
                {reportText.length}/500
              </CustomText>
            </View>
          </View>

          <View style={[styles.buttonRow, styles.actionsContainer]}>
            <TouchableOpacity
              style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmitRegular}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {submitMode === "regular" ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <CustomText variant="h6" fontWeight="medium" style={styles.primaryButtonText}>
                  Submit Report
                </CustomText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                { borderColor: Colors.primary, backgroundColor: colors.card },
                isSubmitting && styles.buttonDisabled,
              ]}
              onPress={handleSubmitWithWhatsApp}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {submitMode === "whatsapp" ? (
                <ActivityIndicator color={Colors.primary} size="small" />
              ) : (
                <View style={styles.whatsappButtonContent}>
                  <Ionicons name="logo-whatsapp" size={16} color={Colors.primary} />
                  <CustomText variant="h6" fontWeight="medium" style={{ color: Colors.primary }}>
                    Submit + WhatsApp
                  </CustomText>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.sectionCard,
              styles.submissionsContainer,
              { backgroundColor: colors.card },
            ]}
          >
            <CustomText variant="h5" fontWeight="bold" style={{ color: colors.text }}>
              Recent Submissions
            </CustomText>

            {feedbacks.length === 0 ? (
              <CustomText variant="h6" style={{ color: colors.gray[500] }}>
                No reports submitted yet.
              </CustomText>
            ) : (
              recentFeedbacks.map((feedback, index) => {
                const palette = typeColors[feedback.type];
                return (
                  <View
                    key={`${feedback.timestamp}-${index}`}
                    style={[
                      styles.feedbackCard,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.feedbackHeader}>
                      <View
                        style={[
                          styles.feedbackType,
                          {
                            backgroundColor: palette.light,
                            borderColor: `${palette.active}55`,
                          },
                        ]}
                      >
                        <CustomText
                          variant="h7"
                          fontWeight="medium"
                          style={{ color: palette.active }}
                        >
                          {feedback.type}
                        </CustomText>
                      </View>
                      <CustomText variant="h7" style={{ color: colors.gray[500] }}>
                        {new Date(feedback.timestamp).toLocaleString()}
                      </CustomText>
                    </View>

                    <CustomText variant="h6" style={{ color: colors.text, marginTop: 6 }}>
                      {feedback.text}
                    </CustomText>

                    <CustomText variant="h7" style={{ color: colors.gray[500], marginTop: 8 }}>
                      {feedback.name} | {feedback.email}
                    </CustomText>
                  </View>
                );
              })
            )}
          </View>

          <View style={{ height: bottom + 16 }} />
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
};

export default HelpScreen;
