import { initializeRateAlerts } from "@/services/rateAlertNotificationService";
import { useEffect } from "react";

const useRateAlerts = () => {
  useEffect(() => {
    initializeRateAlerts().catch((error) => {
      console.error("Failed to initialize rate alerts:", error);
    });
  }, []);
};

export default useRateAlerts;

