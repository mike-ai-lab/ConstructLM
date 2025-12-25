import { useEffect } from 'react';
import { activityLogger } from '../services/activityLogger';

/**
 * Hook to initialize activity logging for the app
 * Logs session start/end and provides access to logger
 */
export const useActivityLogger = () => {
  useEffect(() => {
    // Log session start
    activityLogger.logSessionStart();

    // Log session end on unmount
    return () => {
      activityLogger.logSessionEnd();
    };
  }, []);

  return activityLogger;
};
