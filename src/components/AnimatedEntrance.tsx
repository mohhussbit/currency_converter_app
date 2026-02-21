import React, { useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

interface AnimatedEntranceProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  duration?: number;
  distance?: number;
  scaleFrom?: number;
  trigger?: boolean | number | string;
}

const AnimatedEntrance: React.FC<AnimatedEntranceProps> = ({
  children,
  style,
  delay = 0,
  duration = 220,
  distance = 8,
  scaleFrom = 0.985,
  trigger,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(distance);
  const scale = useSharedValue(scaleFrom);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  useEffect(() => {
    const config = { duration, easing: Easing.out(Easing.cubic) };
    opacity.value = 0;
    translateY.value = distance;
    scale.value = scaleFrom;

    opacity.value = withDelay(delay, withTiming(1, config));
    translateY.value = withDelay(delay, withTiming(0, config));
    scale.value = withDelay(delay, withTiming(1, config));
  }, [delay, distance, duration, opacity, scale, scaleFrom, translateY, trigger]);

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

export default React.memo(AnimatedEntrance);
