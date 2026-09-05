import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Runs for every logged-in user on every page so that ALL roles
 * (citizens, responders, admins, super admins) continuously report
 * their GPS location to the backend. Without this, privileged
 * accounts that skip the citizen app never get a location saved,
 * and the reel feed (which is geo-filtered) returns empty for them.
 *
 * If geolocation permission expires or is temporarily unavailable,
 * this component silently retries in the background without
 * disrupting the user's current screen.
 */
export const LocationReporter: React.FC = () => {
  const { user } = useAuth();
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;
    if (!navigator.geolocation) return;

    const sendLocation = async (lat: number, lng: number) => {
      const token = localStorage.getItem('achiv_token');
      if (!token) return;
      try {
        await fetch(`${import.meta.env.VITE_API_URL}/api/auth/location`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ latitude: lat, longitude: lng })
        });
      } catch (error) {
        // Silently fail — no need to surface network errors to the user
      }
    };

    // Continuous tracking via watchPosition
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        sendLocation(position.coords.latitude, position.coords.longitude);
      },
      () => {
        // Permission denied or unavailable — silently handled by retry below
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    // Fallback interval: try to get position every 15s in case watchPosition
    // stops firing (happens when permission is revoked mid-session).
    // If permission is denied, this silently fails and retries next cycle.
    const intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          sendLocation(position.coords.latitude, position.coords.longitude);
        },
        () => {
          // Permission denied or unavailable — will retry on next interval
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }, 15000);

    // If watchPosition fails entirely, attempt a full re-probe every 60s
    // to recover if the user grants permission in browser settings.
    retryRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        () => {
          // Permission recovered — watchPosition may resume on next call
        },
        () => {
          // Still denied — will retry on next cycle
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }, 60000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(intervalId);
      if (retryRef.current) clearInterval(retryRef.current);
    };
  }, [user]);

  return null;
};
