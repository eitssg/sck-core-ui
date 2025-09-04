import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store'; // Use your existing type
import { 
  selectAuth, 
  selectIsAuthenticated, 
  selectTokens,
  initializeAuth, 
  refreshAccessToken,
  updateActivity,
  logoutUser,
} from '@/store/slices/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>(); // This should work now
  const auth = useSelector(selectAuth);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const tokens = useSelector(selectTokens);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize auth from localStorage on mount
  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  // Set up automatic token refresh
  useEffect(() => {
    if (tokens && isAuthenticated) {
      // Clear existing timer
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      // Calculate refresh time (2 minutes before expiration)
      const refreshBuffer = 2 * 60 * 1000; // 2 minutes
      const timeUntilRefresh = (tokens.expires_in * 1000) - refreshBuffer;
      const refreshTime = Math.max(timeUntilRefresh, 60000); // Minimum 1 minute

      console.log(`Setting up token refresh in ${Math.round(refreshTime / 1000)} seconds`);

      refreshTimerRef.current = setTimeout(() => {
        console.log('Auto-refreshing access token...');
        dispatch(refreshAccessToken()); // This is correct now
      }, refreshTime);

      return () => {
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
      };
    }
  }, [tokens, isAuthenticated, dispatch]);

  // Track user activity to prevent unnecessary refreshes when user is inactive
  useEffect(() => {
    const handleActivity = () => {
      dispatch(updateActivity());
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    // Throttle activity updates to every 30 seconds
    const throttledActivity = () => {
      if (activityTimerRef.current) return;
      
      activityTimerRef.current = setTimeout(() => {
        handleActivity();
        activityTimerRef.current = null;
      }, 30000); // 30 seconds
    };

    if (isAuthenticated) {
      events.forEach(event => {
        document.addEventListener(event, throttledActivity, true);
      });
    }

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledActivity, true);
      });
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current);
      }
    };
  }, [isAuthenticated, dispatch]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current);
      }
      //dispatch(clearRefreshTimer());
    };
  }, [dispatch]);

  // Helper functions
  const logout = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    if (activityTimerRef.current) {
      clearTimeout(activityTimerRef.current);
      activityTimerRef.current = null;
    }
    dispatch(logoutUser());
  };

  const forceRefreshToken = () => {
    dispatch(refreshAccessToken()); // This is correct now
  };

  return {
    ...auth,
    logout,
    forceRefreshToken,
    // Helper to get current access token for API calls
    getAccessToken: () => tokens?.access_token || null,
    // Helper to check if token is close to expiring
    isTokenExpiringSoon: () => {
      if (!tokens?.expires_at) return false;
      const timeUntilExpiry = tokens.expires_at - Date.now();
      return timeUntilExpiry < 5 * 60 * 1000; // Less than 5 minutes
    },
  };
};
