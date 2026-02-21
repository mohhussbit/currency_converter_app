import type { HapticType } from "@/utils/haptics";
import { triggerHaptic } from "@/utils/haptics";
import React, { useCallback } from "react";
import {
  GestureResponderEvent,
  TouchableOpacity,
  TouchableOpacityProps,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

interface AnimatedTouchableProps extends TouchableOpacityProps {
  haptic?: HapticType | null;
  longPressHaptic?: HapticType | null;
  pressScale?: number;
  pressInDuration?: number;
  pressOutDuration?: number;
}

const AnimatedTouchable: React.FC<AnimatedTouchableProps> = ({
  children,
  haptic = "selection",
  longPressHaptic = null,
  pressScale = 0.975,
  pressInDuration = 85,
  pressOutDuration = 140,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  style,
  ...rest
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animateScale = useCallback(
    (toValue: number, duration: number) => {
      scale.value = withTiming(toValue, {
        duration,
        easing: Easing.out(Easing.quad),
      });
    },
    [scale]
  );

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      animateScale(pressScale, pressInDuration);
      onPressIn?.(event);
    },
    [animateScale, onPressIn, pressInDuration, pressScale]
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      animateScale(1, pressOutDuration);
      onPressOut?.(event);
    },
    [animateScale, onPressOut, pressOutDuration]
  );

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      if (haptic) {
        triggerHaptic(haptic);
      }
      onPress?.(event);
    },
    [haptic, onPress]
  );

  const handleLongPress = useCallback(
    (event: GestureResponderEvent) => {
      if (longPressHaptic) {
        triggerHaptic(longPressHaptic);
      }
      onLongPress?.(event);
    },
    [longPressHaptic, onLongPress]
  );

  return (
    <AnimatedTouchableOpacity
      {...rest}
      style={[style, animatedStyle]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      onLongPress={handleLongPress}
    >
      {children}
    </AnimatedTouchableOpacity>
  );
};

export default React.memo(AnimatedTouchable);
