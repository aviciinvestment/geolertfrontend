import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { FeedView } from './views/FeedView'
import { GoLiveView } from './views/GoLiveView'
import { AuthView } from './views/AuthView'
import { SettingsView } from './views/SettingsView'
import { UserProfileView } from './views/UserProfileView'
import LandingView from './views/LandingView'
import { AudioProvider } from './context/AudioContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { GoogleOAuthProvider } from '@react-oauth/google'

import { PlusCircle, Home, Settings, MapPin, RefreshCw } from 'lucide-react'
import { MissionPlannerView } from './views/MissionPlannerView'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

type View = 'feed' | 'golive' | 'settings' | 'profile';

function ProtectedApp() {
  const [currentView, setCurrentView] = useState<View>('feed')
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [locationGranted, setLocationGranted] = useState<boolean | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const { user, isLoading } = useAuth()
  const loc = useLocation()
  const targetReelId = (loc.state as { targetReelId?: string })?.targetReelId || null

  useEffect(() => {
    const path = window.location.pathname;
    const reelMatch = path.match(/^\/app\/reel\/(.+)$/);
    if (reelMatch) {
      setCurrentView('feed');
    }
  }, []);

  // Check geolocation permission and block app if denied
  useEffect(() => {
    if (!user) return;
    if (!navigator.geolocation) {
      setLocationGranted(false);
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationGranted(true);
        setLocationError(null);
      },
      (error) => {
        setLocationGranted(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission denied. GeoAlert requires location access to show you alerts within 30 miles. Please enable location in your browser/device settings and reload.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError('Location information unavailable. Please ensure your device has GPS enabled.');
        } else {
          setLocationError('Location request timed out. Please check your connection and try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [user]);

  // Location tracking: watchPosition + periodic force-send every 15s
  useEffect(() => {
    if (!user || !locationGranted) return;
    if (!navigator.geolocation) return;

    const sendLocation = async (lat: number, lng: number) => {
      const token = localStorage.getItem('geolert_token');
      if (token) {
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
      }
    };

    // watchPosition for continuous tracking
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        sendLocation(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    // Also force-send every 15 seconds for cases where watchPosition doesn't fire
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

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Block app if location is not granted
  if (locationGranted === false) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <MapPin className="w-10 h-10 text-red-400" />
          </div>
          <div>
            <h2 className="text-white text-xl font-bold mb-2">Location Required</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              {locationError || 'GeoAlert needs your location to show you nearby alerts within 30 miles.'}
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
          <p className="text-white/30 text-xs">
            After enabling location in your browser settings, click retry.
          </p>
        </div>
      </div>
    )
  }

  const navigateToProfile = (userId: string) => {
    setProfileUserId(userId);
    setCurrentView('profile');
  };

  const renderView = () => {
    switch (currentView) {
      case 'golive':
        return <GoLiveView onCancel={() => setCurrentView('feed')} />;
      case 'settings':
        return <SettingsView onBack={() => setCurrentView('feed')} />;

      case 'profile':
        return profileUserId ? (
          <UserProfileView userId={profileUserId} onBack={() => setCurrentView('feed')} />
        ) : (
          <FeedView onProfileClick={navigateToProfile} targetReelId={targetReelId} />
        );
      default:
        return <FeedView onProfileClick={navigateToProfile} targetReelId={targetReelId} />;
    }
  };

  return (
    <div className="flex justify-center bg-black min-h-screen text-white overflow-hidden">
      <div className="relative w-full max-w-[480px] h-[100dvh] bg-zinc-950 border-x border-white/10">

        <main className="absolute inset-0 overflow-hidden">
          {renderView()}
        </main>

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-[72px] bg-black/80 backdrop-blur-2xl border-t border-white/10 flex items-center justify-around z-50 pb-safe">
          <button
            onClick={() => setCurrentView('feed')}
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${currentView === 'feed' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            <Home className="w-[26px] h-[26px] mb-1" />
            <span className="text-[10px] font-medium tracking-wide">Home</span>
          </button>

          <button
            onClick={() => setCurrentView('golive')}
            className="flex items-center justify-center transition-transform hover:scale-105 active:scale-95 -mt-6"
          >
            <div className="w-14 h-14 bg-gradient-to-tr from-pink-500 to-violet-500 rounded-full flex items-center justify-center shadow-lg shadow-pink-500/30 border-4 border-black">
              <PlusCircle className="w-6 h-6 text-white" />
            </div>
          </button>


          <button
            onClick={() => setCurrentView('settings')}
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${currentView === 'settings' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            <Settings className="w-[26px] h-[26px] mb-1" />
            <span className="text-[10px] font-medium tracking-wide">Settings</span>
          </button>
        </nav>
      </div>
    </div>
  )
}

function ProtectedAuthority() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <MissionPlannerView />
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider defaultTheme="dark" storageKey="geolert-theme">
        <BrowserRouter>
            <AuthProvider>
              <AudioProvider>
                <Routes>
                  <Route path="/" element={<LandingView />} />
                  <Route path="/login" element={<AuthView />} />
                  <Route path="/app/*" element={<ProtectedApp />} />
                  <Route path="/authority" element={<ProtectedAuthority />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AudioProvider>
            </AuthProvider>
          </BrowserRouter>
      </ThemeProvider>
    </GoogleOAuthProvider>
  )
}

export default App
