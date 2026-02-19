import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export type HapticType =
  | "selection"
  | "light"
  | "medium"
  | "success"
  | "warning"
  | "error";

let lastTriggerAt = 0;
const MIN_TRIGGER_INTERVAL_MS = 40;

export const triggerHaptic = (type: HapticType = "selection") => {
  if (Platform.OS === "web") {
    return;
  }

  const now = Date.now();
  if (now - lastTriggerAt < MIN_TRIGGER_INTERVAL_MS) {
    return;
  }
  lastTriggerAt = now;

  const run = async () => {
    switch (type) {
      case "selection":
        await Haptics.selectionAsync();
        break;
      case "light":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "medium":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "success":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "warning":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case "error":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      default:
        await Haptics.selectionAsync();
    }
  };

  run().catch((error) => {
    console.error("Haptic trigger failed:", error);
  });
};
