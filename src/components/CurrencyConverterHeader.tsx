import AnimatedTouchable from "@/components/AnimatedTouchable";
import AnimatedEntrance from "@/components/AnimatedEntrance";
import CustomText from "@/components/CustomText";
import { Colors } from "@/constants/Colors";
import { Spacing } from "@/constants/Spacing";
import { styles } from "@/styles/screens/CurrencyConverterScreen.styles";
import type { ThemeColors } from "@/types/theme";
import { formatLastUpdated } from "@/utils/currencyConverterUtils";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";

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
  const [tick, setTick] = useState(0);
  const lastUpdatedLabel = useMemo(
    () => formatLastUpdated(lastUpdatedAt),
    [lastUpdatedAt, tick]
  );

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <AnimatedEntrance delay={10} distance={6}>
      <View style={styles.header}>
        <View style={styles.headerTextBlock}>
          <CustomText variant="h3" fontWeight="bold">
            {appName}
          </CustomText>
          <CustomText
            variant="h6"
            fontWeight="medium"
            style={{ color: colors.gray[400] }}
          >
            {lastUpdatedLabel}
          </CustomText>
        </View>
        <View style={styles.headerActions}>
          <AnimatedTouchable
            onPress={onShare}
            activeOpacity={0.8}
            hitSlop={10}
            haptic="light"
          >
            <Ionicons
              name="share-social-outline"
              size={Spacing.iconSize}
              color={Colors.primary}
            />
          </AnimatedTouchable>
          <AnimatedTouchable
            onPress={onOpenSettings}
            activeOpacity={0.8}
            hitSlop={10}
            haptic="light"
          >
            <Ionicons
              name="settings-outline"
              size={Spacing.iconSize}
              color={Colors.primary}
            />
          </AnimatedTouchable>
        </View>
      </View>
    </AnimatedEntrance>
  );
};

export default React.memo(CurrencyConverterHeader);
