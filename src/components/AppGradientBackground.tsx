import { Colors } from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";

interface AppGradientBackgroundProps {
  subtle?: boolean;
}

const AppGradientBackground: React.FC<AppGradientBackgroundProps> = ({
  subtle = false,
}) => {
  const { colors } = useTheme();

  const baseColors = useMemo<[string, string, string]>(
    () =>
      subtle
        ? [colors.background, `${Colors.secondary}20`, `${Colors.accent}1C`]
        : [colors.background, `${Colors.secondary}35`, `${Colors.accent}28`],
    [colors.background, subtle]
  );

  const sheenColors = useMemo<[string, string, string]>(
    () =>
      subtle
        ? ["rgba(255, 255, 255, 0.08)", "transparent", "rgba(255, 255, 255, 0.04)"]
        : ["rgba(255, 255, 255, 0.2)", "transparent", "rgba(255, 255, 255, 0.08)"],
    [subtle]
  );

  return (
    <View pointerEvents="none" style={styles.fill}>
      <LinearGradient
        colors={baseColors}
        start={{ x: 0.04, y: 0.02 }}
        end={{ x: 0.96, y: 1 }}
        style={styles.fill}
      />
      <LinearGradient
        colors={sheenColors}
        start={{ x: 0.1, y: 0.04 }}
        end={{ x: 0.88, y: 0.96 }}
        style={styles.fill}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default React.memo(AppGradientBackground);
