import { initializeRetentionReminders } from "@/services/retentionReminderService";
import { useEffect } from "react";

const useRetentionReminders = () => {
  useEffect(() => {
    initializeRetentionReminders().catch((error) => {
      console.error("Failed to initialize retention reminders:", error);
    });
  }, []);
};

export default useRetentionReminders;
