import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleProp,
  ViewStyle,
} from "react-native";

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
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;
  const scale = useRef(new Animated.Value(scaleFrom)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(distance);
    scale.setValue(scaleFrom);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, distance, duration, opacity, scale, scaleFrom, translateY, trigger]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

export default React.memo(AnimatedEntrance);
