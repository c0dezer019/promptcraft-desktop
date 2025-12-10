import { useEffect, useRef } from 'react';

/**
 * Hook for polling job status updates
 * Automatically polls for jobs with "pending" or "running" status
 *
 * @param {Function} loadJobs - Function to reload jobs
 * @param {Array} jobs - Current jobs array
 * @param {number} interval - Polling interval in milliseconds (default: 3000)
 * @param {boolean} enabled - Whether polling is enabled (default: true)
 */
export function useJobPolling(loadJobs, jobs = [], interval = 3000, enabled = true) {
  const intervalRef = useRef(null);
  const isPollingRef = useRef(false);

  useEffect(() => {
    // Don't poll if disabled or no load function
    if (!enabled || !loadJobs) {
      return;
    }

    // Check if there are any active jobs (pending or running)
    const hasActiveJobs = jobs.some(job =>
      job.status === 'pending' || job.status === 'running'
    );

    // Start polling if there are active jobs
    if (hasActiveJobs && !isPollingRef.current) {
      console.log('[useJobPolling] Starting job status polling');
      isPollingRef.current = true;

      intervalRef.current = setInterval(async () => {
        try {
          await loadJobs();
        } catch (error) {
          console.error('[useJobPolling] Error polling jobs:', error);
        }
      }, interval);
    }

    // Stop polling if no active jobs
    if (!hasActiveJobs && isPollingRef.current) {
      console.log('[useJobPolling] Stopping job status polling (no active jobs)');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isPollingRef.current = false;
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        console.log('[useJobPolling] Cleaning up polling interval');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isPollingRef.current = false;
    };
  }, [jobs, interval, enabled, loadJobs]);

  return {
    isPolling: isPollingRef.current,
    hasActiveJobs: jobs.some(job => job.status === 'pending' || job.status === 'running')
  };
}
