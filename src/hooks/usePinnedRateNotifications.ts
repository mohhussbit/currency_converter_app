import { initializePinnedRateNotifications } from "@/services/pinnedRateNotificationService";
import { useEffect } from "react";

const usePinnedRateNotifications = () => {
  useEffect(() => {
    initializePinnedRateNotifications().catch((error) => {
      console.error("Failed to initialize pinned rate notifications:", error);
    });
  }, []);
};

export default usePinnedRateNotifications;

