import CustomText from "@/components/CustomText";
import {
  Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { styles } from "@/styles/screens/SettingsScreen.styles";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router } from "expo-router";
import React,
  { useCallback,
  useEffect } from "react";
import {
  Alert,
  BackHandler,
  Linking,
  Platform,
  ScrollView,
  View,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PRIVACY_POLICY_URL =
  "https://www.termsfeed.com/live/b9b83488-3035-4933-af3e-8cc8e964e4b4";
const TERMS_OF_SERVICE_URL =
  "https://www.termsfeed.com/live/b9b83488-3035-4933-af3e-8cc8e964e4b4";
const APP_STORE_ID = process.env.EXPO_PUBLIC_APP_STORE_ID;

type ThemeMode = "light" | "dark" | "system";

const themeOptions: {
  label: string;
  value: ThemeMode;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { label: "System", value: "system", icon: "phone-portrait-outline" },
  { label: "Dark", value: "dark", icon: "moon-outline" },
  { label: "Light", value: "light", icon: "sunny-outline" },
];

const proFeatures = [
  "Advanced chart analytics",
  "Priority support response",
  "Ad-free experience",
];

interface SettingsActionItemProps {
  colors: ReturnType<typeof useTheme>["colors"];
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}

const SettingsActionItemComponent: React.FC<SettingsActionItemProps> = ({
  colors,
  icon,
  title,
  description,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.actionItem,
        {
          borderColor: colors.border,
          borderBottomColor: colors.border,
          backgroundColor: colors.gray[100],
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.actionLeft}>
        <View style={[styles.actionIcon, { backgroundColor: colors.gray[100] }]}>
          <Ionicons name={icon} size={18} color={Colors.primary} />
        </View>
        <View style={styles.actionTextWrap}>
          <CustomText
            variant="h5"
            fontWeight="medium"
            style={[styles.actionTitle, { color: colors.text }]}
          >
            {title}
          </CustomText>
          <CustomText
            variant="h6"
            style={[styles.actionDescription, { color: colors.gray[500] }]}
          >
            {description}
          </CustomText>
        </View>
      </View>
      <Ionicons
        name="chevron-forward"
        size={Spacing.iconSize}
        color={colors.gray[400]}
      />
    </TouchableOpacity>
  );
};

const SettingsActionItem = React.memo(SettingsActionItemComponent);

interface GradientSectionCardProps {
  colors: ReturnType<typeof useTheme>["colors"];
  children: React.ReactNode;
}

const GradientSectionCardComponent: React.FC<GradientSectionCardProps> = ({
  colors,
  children,
}) => {
  return (
    <View
      style={[
        styles.sectionCard,
        {
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
      ]}
    >
      {children}
    </View>
  );
};

const GradientSectionCard = React.memo(GradientSectionCardComponent);

const SettingsScreen = () => {
  const { colors, theme, setTheme } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const appVersion = Constants.expoConfig?.version || "1.0.0";

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.push("/");
        return true;
      }
    );

    return () => backHandler.remove();
  }, []);

  const showAlert = useCallback((title: string, message: string) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
      return;
    }
    Alert.alert(title, message);
  }, []);

  const openUrl = useCallback(
    async (url: string) => {
      try {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
          return;
        }
        showAlert("Unavailable", "This link could not be opened on this device.");
      } catch (error) {
        console.error("Error opening URL:", error);
        showAlert("Error", "Unable to open the link right now.");
      }
    },
    [showAlert]
  );

  const handleRateApp = useCallback(async () => {
    if (Platform.OS === "android") {
      const packageName = Constants.expoConfig?.android?.package;
      if (!packageName) {
        showAlert("Rate App", "Store package is not configured.");
        return;
      }

      const marketUrl = `market://details?id=${packageName}`;
      const webStoreUrl = `https://play.google.com/store/apps/details?id=${packageName}`;
      const canOpenMarket = await Linking.canOpenURL(marketUrl);
      await openUrl(canOpenMarket ? marketUrl : webStoreUrl);
      return;
    }

    if (Platform.OS === "ios") {
      if (!APP_STORE_ID) {
        showAlert("Rate App", "App Store rating link is not configured yet.");
        return;
      }
      await openUrl(
        `itms-apps://itunes.apple.com/app/id${APP_STORE_ID}?action=write-review`
      );
      return;
    }

    await openUrl("https://converx.expo.app");
  }, [openUrl, showAlert]);

  const handleUpgradeToPro = useCallback(() => {
    showAlert(
      "Upgrade to Pro",
      "Pro plan is coming soon. It will unlock advanced charts, smart alerts, and ad-free usage."
    );
  }, [showAlert]);

  const handleOpenHistory = useCallback(() => {
    router.navigate("/history");
  }, []);
  const handleOpenPinnedRate = useCallback(() => {
    router.navigate("/pinned-rate-notification");
  }, []);
  const handleOpenRateAlerts = useCallback(() => {
    router.navigate("/rate-alerts");
  }, []);
  const handleOpenSupport = useCallback(() => {
    router.navigate("/help");
  }, []);
  const handleOpenPrivacyPolicy = useCallback(() => {
    void openUrl(PRIVACY_POLICY_URL);
  }, [openUrl]);
  const handleOpenTerms = useCallback(() => {
    void openUrl(TERMS_OF_SERVICE_URL);
  }, [openUrl]);

  return (
    <View
      style={[styles.container, { backgroundColor: "transparent" }]}
    >
      <View style={[styles.header, { paddingTop: top + 10 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.8}
          hitSlop={10}
        >
          <Ionicons
            name="arrow-back"
            size={Spacing.iconSize}
            color={Colors.primary}
          />
        </TouchableOpacity>
        <CustomText variant="h4" fontWeight="bold" style={{ color: colors.text }}>
          Settings
        </CustomText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.proBanner}>
          <View style={styles.proBadge}>
            <CustomText variant="h6" fontWeight="bold" style={styles.proBadgeText}>
              PRO
            </CustomText>
          </View>
          <CustomText variant="h3" fontWeight="bold" style={styles.proTitle}>
            Upgrade to Pro
          </CustomText>
          <CustomText variant="h6" style={styles.proSubtitle}>
            Unlock premium tools and a faster workflow.
          </CustomText>

          <View style={styles.featureList}>
            {proFeatures.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
                <CustomText variant="h6" style={styles.featureText}>
                  {feature}
                </CustomText>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.proButton}
            onPress={handleUpgradeToPro}
            activeOpacity={0.9}
          >
            <CustomText variant="h6" fontWeight="bold" style={styles.proButtonText}>
              Upgrade Now
            </CustomText>
            <Ionicons name="arrow-forward" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <GradientSectionCard colors={colors}>
          <CustomText variant="h5" fontWeight="bold" style={{ color: colors.text }}>
            Theme Management
          </CustomText>
          <CustomText variant="h6" style={{ color: colors.gray[500] }}>
            Choose how the app looks.
          </CustomText>

          <View style={styles.themeChips}>
            {themeOptions.map((option) => {
              const isActive = theme === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.themeChip,
                    {
                      borderColor: isActive ? Colors.primary : colors.border,
                      backgroundColor: isActive ? Colors.primary : colors.background,
                    },
                  ]}
                  onPress={() => setTheme(option.value)}
                  activeOpacity={0.9}
                >
                  <Ionicons
                    name={option.icon}
                    size={16}
                    color={isActive ? Colors.white : colors.gray[500]}
                  />
                  <CustomText
                    variant="h6"
                    fontWeight="medium"
                    style={{ color: isActive ? Colors.white : colors.text }}
                  >
                    {option.label}
                  </CustomText>
                </TouchableOpacity>
              );
            })}
          </View>
        </GradientSectionCard>

        <GradientSectionCard colors={colors}>
          <CustomText variant="h5" fontWeight="bold" style={{ color: colors.text }}>
            Quick Access
          </CustomText>
          <SettingsActionItem
            colors={colors}
            icon="time-outline"
            title="History"
            description="View and manage your conversion history."
            onPress={handleOpenHistory}
          />
          <SettingsActionItem
            colors={colors}
            icon="notifications-outline"
            title="Pinned Rate Alert"
            description="Configure a target rate notification."
            onPress={handleOpenPinnedRate}
          />
          <SettingsActionItem
            colors={colors}
            icon="pulse-outline"
            title="Rate Alerts"
            description="Notify when a currency pair hits your target."
            onPress={handleOpenRateAlerts}
          />
        </GradientSectionCard>

        <GradientSectionCard colors={colors}>
          <CustomText variant="h5" fontWeight="bold" style={{ color: colors.text }}>
            Support
          </CustomText>
          <SettingsActionItem
            colors={colors}
            icon="help-buoy-outline"
            title="App Support"
            description="Contact support and send feedback."
            onPress={handleOpenSupport}
          />
          <SettingsActionItem
            colors={colors}
            icon="star-outline"
            title="Rate App"
            description="Leave a rating to support the app."
            onPress={handleRateApp}
          />
        </GradientSectionCard>

        <View style={[styles.footer, { borderTopColor: colors.border }]}> 
          <CustomText
            variant="h6"
            fontWeight="medium"
            style={[styles.versionText, { color: colors.gray[500] }]}
          >
            App Version: v{appVersion}
          </CustomText>

          <View style={styles.policyLinks}>
            <TouchableOpacity
              onPress={handleOpenPrivacyPolicy}
              activeOpacity={0.8}
            >
              <CustomText
                variant="h6"
                fontWeight="medium"
                style={[styles.policyLink, { color: Colors.primary }]}
              >
                Privacy Policy
              </CustomText>
            </TouchableOpacity>
            <CustomText variant="h6" style={{ color: colors.gray[400] }}>
              |
            </CustomText>
            <TouchableOpacity
              onPress={handleOpenTerms}
              activeOpacity={0.8}
            >
              <CustomText
                variant="h6"
                fontWeight="medium"
                style={[styles.policyLink, { color: Colors.primary }]}
              >
                Terms of Service
              </CustomText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default SettingsScreen;



