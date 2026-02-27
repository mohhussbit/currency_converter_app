import { useEffect } from "react";

import { initializePinnedRateNotifications } from "@/services/pinnedRateNotificationService";

const usePinnedRateNotifications = () => {
  useEffect(() => {
    initializePinnedRateNotifications().catch((error) => {
      console.error("Failed to initialize pinned rate notifications:", error);
    });
  }, []);
};

export default usePinnedRateNotifications;
