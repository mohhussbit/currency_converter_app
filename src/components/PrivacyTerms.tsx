import AnimatedTouchable from "@/components/AnimatedTouchable";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { styles } from "@/styles/components/PrivacyTerms.styles";
import { router } from "expo-router";
import React from "react";
import { Linking, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomText from "./CustomText";

const PrivacyTerms = ({ currentVersion }: { currentVersion: string }) => {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();

  const openPrivacyPolicy = () => {
    const url =
      "https://www.termsfeed.com/live/b9b83488-3035-4933-af3e-8cc8e964e4b4";
    Linking.openURL(url).catch((err) =>
      console.error("Failed to open Privacy Policy URL:", err)
    );
  };

  return (
    <View style={[styles.footer, { bottom: bottom + 5 }]}>
      {/* Help Link */}
      <View style={styles.helpLinkContainer}>
        <AnimatedTouchable
          onPress={() => router.navigate("/help")}
          activeOpacity={0.8}
        >
          <CustomText
            variant="h6"
            fontWeight="medium"
            style={[styles.helpLink, { color: Colors.primary }]}
          >
            Need Help? Contact Support
          </CustomText>
        </AnimatedTouchable>
      </View>

      {/* Privacy Policy and Terms */}
      <View style={styles.footerTextContainer}>
        <AnimatedTouchable onPress={openPrivacyPolicy} activeOpacity={0.8}>
          <CustomText style={styles.footerText}>Privacy Policy</CustomText>
        </AnimatedTouchable>
        <CustomText style={{ color: colors.gray[400] }}>•</CustomText>
        <AnimatedTouchable onPress={openPrivacyPolicy} activeOpacity={0.8}>
          <CustomText style={styles.footerText}>Terms of Service</CustomText>
        </AnimatedTouchable>
      </View>

      {/* Version Code */}
      <CustomText
        variant="h6"
        fontWeight="medium"
        style={[styles.versionCodeText, { color: colors.gray[400] }]}
      >
        v{currentVersion}
      </CustomText>
    </View>
  );
};

export default PrivacyTerms;
