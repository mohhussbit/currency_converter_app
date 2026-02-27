import React from "react";

import { TouchableOpacity, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { styles } from "@/styles/screens/CurrencyConverterScreen.styles";
import type { ThemeColors } from "@/types/theme";
import { formatLastUpdated } from "@/utils/currencyConverterUtils";

interface CurrencyConverterHeaderProps {
  appName: string;
  lastUpdatedAt: number | null;
  colors: ThemeColors;
  onShare: () => void;
  onOpenSettings: () => void;
}

const CurrencyConverterHeader: React.FC<CurrencyConverterHeaderProps> = ({
  appName,
  lastUpdatedAt,
  colors,
  onShare,
  onOpenSettings,
}) => {
  const lastUpdatedLabel = () => formatLastUpdated(lastUpdatedAt);

  return (
    <View>
      <View style={styles.header}>
        <View style={styles.headerTextBlock}>
          <CustomText variant="h3" fontWeight="bold">
            {appName}
          </CustomText>
          <CustomText variant="h6" fontWeight="medium" style={{ color: colors.gray[400] }}>
            {lastUpdatedLabel()}
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
            onPress={onOpenSettings}
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
