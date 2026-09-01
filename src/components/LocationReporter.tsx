import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Runs for every logged-in user on every page so that ALL roles
 (citizens, responders, admins, super admins) continuously report
 * their GPS location to the backend. Without this, privileged
 * accounts that skip the citizen app never get a location saved,
 * and the reel feed (which is geo-filtered) returns empty for them.
 */
export const LocationReporter: React.FC = () => {
  const { user } = useAuth();

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
        console.error('Failed to update location', error);
      }
    };

    // Continuous tracking
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        sendLocation(position.coords.latitude, position.coords.longitude);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    // Force-send every 15s in case watchPosition doesn't fire
    const intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          sendLocation(position.coords.latitude, position.coords.longitude);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }, 15000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(intervalId);
    };
  }, [user]);

  return null;
};
