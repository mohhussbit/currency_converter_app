import React from "react";

import { TouchableOpacity, View } from "react-native";

import Constants from "expo-constants";
import { router } from "expo-router";

import { Ionicons } from "@expo/vector-icons";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { useTheme } from "@/context/ThemeContext";
import { styles } from "@/styles/screens/CurrencyConverterScreen.styles";
import { formatLastUpdated } from "@/utils/currencyConverterUtils";

interface CurrencyConverterHeaderProps {
  onShare: () => void;
  lastUpdatedAt: number;
}

const CurrencyConverterHeader: React.FC<CurrencyConverterHeaderProps> = ({
  onShare,
  lastUpdatedAt,
}) => {
  const appName = Constants.expoConfig?.name;
  const { colors } = useTheme();

  return (
    <View>
      <View style={styles.header}>
        <View style={styles.headerTextBlock}>
          <CustomText variant="h3" fontWeight="bold">
            {"ConverX"}
          </CustomText>
          <CustomText variant="h6" fontWeight="medium" style={{ color: colors.gray[400] }}>
            {formatLastUpdated(lastUpdatedAt)}
          </CustomText>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={onShare}
            activeOpacity={0.8}
            hitSlop={10}
            testID="home-share-button"
          >
            <Ionicons name="share-social-outline" size={Spacing.iconSize} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.navigate("/settings")}
            activeOpacity={0.8}
            hitSlop={10}
            testID="home-settings-button"
          >
            <Ionicons name="settings-outline" size={Spacing.iconSize} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default CurrencyConverterHeader;
