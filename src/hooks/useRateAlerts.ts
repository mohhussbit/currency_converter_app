import { useEffect } from "react";

import { initializeRateAlerts } from "@/services/rateAlertNotificationService";

const useRateAlerts = () => {
  useEffect(() => {
    initializeRateAlerts().catch((error) => {
      console.error("Failed to initialize rate alerts:", error);
    });
  }, []);
};

export default useRateAlerts;
