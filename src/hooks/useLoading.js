import { useState, useCallback } from 'react';

/**
 * Custom hook for managing loading state with minimum display time
 * @param {number} minimumLoadingTime - Minimum time in ms to show loading state
 * @returns {Object} Loading state and handlers
 */
const useLoading = (minimumLoadingTime = 500) => {
  const [loading, setLoading] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState(0);

  /**
   * Start loading
   */
  const startLoading = useCallback(() => {
    setLoading(true);
    setLoadingStartTime(Date.now());
  }, []);

  /**
   * End loading with minimum display time
   */
  const endLoading = useCallback(() => {
    const currentTime = Date.now();
    const elapsedTime = currentTime - loadingStartTime;
    
    if (elapsedTime >= minimumLoadingTime) {
      setLoading(false);
    } else {
      // Ensure loading state shows for at least minimumLoadingTime
      const remainingTime = minimumLoadingTime - elapsedTime;
      setTimeout(() => {
        setLoading(false);
      }, remainingTime);
    }
  }, [loadingStartTime, minimumLoadingTime]);

  /**
   * Execute function with loading state
   * @param {Function} fn - Function to execute
   * @returns {Promise} Promise resolved with function result
   */
  const withLoading = useCallback(async (fn) => {
    if (!fn || typeof fn !== 'function') {
      console.warn('withLoading requires a function parameter');
      return;
    }
    
    startLoading();
    try {
      const result = await fn();
      endLoading();
      return result;
    } catch (error) {
      endLoading();
      throw error;
    }
  }, [startLoading, endLoading]);

  return {
    loading,
    startLoading,
    endLoading,
    withLoading,
  };
};

export default useLoading; 