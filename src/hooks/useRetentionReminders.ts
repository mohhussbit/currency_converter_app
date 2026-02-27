import { useEffect } from "react";

import { initializeRetentionReminders } from "@/services/retentionReminderService";

const useRetentionReminders = () => {
  useEffect(() => {
    initializeRetentionReminders().catch((error) => {
      console.error("Failed to initialize retention reminders:", error);
    });
  }, []);
};

export default useRetentionReminders;
