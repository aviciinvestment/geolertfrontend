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
import { LocationReporter } from './components/LocationReporter'

import { PlusCircle, Home, Settings, MapPin } from 'lucide-react'
import { MissionPlannerView } from './views/MissionPlannerView'
import { AdminLayout } from './components/AdminLayout'
import { SuperAdminDashboard } from './views/admin/SuperAdminDashboard'
import { AdminDashboard } from './views/admin/AdminDashboard'
import { OnboardSuperAdmin } from './views/admin/OnboardSuperAdmin'
import { OnboardAdmin } from './views/admin/OnboardAdmin'
import { OnboardResponder } from './views/admin/OnboardResponder'
import { FoundersView } from './views/admin/FoundersView'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

type View = 'feed' | 'golive' | 'settings' | 'profile';

function ProtectedApp() {
  const [currentView, setCurrentView] = useState<View>('feed')
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [locationBanner, setLocationBanner] = useState<string | null>(null)
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

  // Silently probe geolocation on mount and show a dismissible banner if
  // denied — but NEVER block the user from their current screen.
  // The permission prompt itself (browser popup) is triggered here; if the
  // user denies, we retry silently every 30s in case they change their mind.
  useEffect(() => {
    if (!user) return;
    if (!navigator.geolocation) return;

    let retryTimer: ReturnType<typeof setInterval> | null = null;
    let dismissed = false;

    const probe = () => {
      if (dismissed) return;
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationBanner(null);
        },
        (error) => {
          if (dismissed) return;
          if (error.code === error.PERMISSION_DENIED) {
            setLocationBanner('Location access helps show nearby alerts. You can enable it in browser settings at any time.');
          } else {
            // POSITION_UNAVAILABLE or TIMEOUT — stay silent, retry later
            setLocationBanner(null);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    // Initial probe
    probe();

    // Retry silently every 30s so that if the user enables location in
    // browser settings the banner disappears automatically.
    retryTimer = setInterval(probe, 30000);

    return () => {
      dismissed = true;
      if (retryTimer) clearInterval(retryTimer);
    };
  }, [user]);

  // Location tracking is handled globally by <LocationReporter /> so that
  // every role (including admins on dashboard pages) reports GPS location.

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
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

        {/* Non-blocking location banner — appears at top, dismissible */}
        {locationBanner && (
          <div className="absolute top-0 left-0 right-0 z-[60] px-4 pt-3">
            <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/95 border border-amber-500/30 rounded-xl shadow-lg">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-amber-200/80 text-xs flex-1">{locationBanner}</p>
              <button
                onClick={() => setLocationBanner(null)}
                className="text-amber-200/40 hover:text-amber-200/80 text-xs shrink-0"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <main className="absolute inset-0 overflow-hidden">
          {renderView()}
        </main>

        {currentView !== 'golive' && (
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
            <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 border-4 border-black">
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
        )}
      </div>
    </div>
  )
}

function ProtectedAuthority() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>
  }

  // Only fully authorized Authority Responders may enter
  const isAuthorizedAuthority =
    user && user.role === 'authority' && user.authorizationStatus === 'approved'

  if (!isAuthorizedAuthority) {
    return <Navigate to={user ? homeForRole(user.role) : '/login'} replace />
  }

  return <MissionPlannerView />
}

function homeForRole(role?: string): string {
  switch (role) {
    case 'founder':
      return '/founder'
    case 'superadmin':
      return '/superadmin'
    case 'admin':
      return '/admin'
    case 'authority':
      return '/authority'
    default:
      return '/app'
  }
}

function ProtectedAdmin({ role }: { role: 'superadmin' | 'admin' }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>
  }

  // Only an authorized account holding the exact role may enter.
  // Super Admin dashboard -> role 'superadmin' (self-onboarded via registration)
  // Admin dashboard       -> role 'admin'      (must be authorized by Super Admin first)
  const isAuthorized =
    user && user.role === role && user.authorizationStatus === 'approved'

  if (!isAuthorized) {
    return <Navigate to={user ? homeForRole(user.role) : '/login'} replace />
  }

  return (
    <AdminLayout role={role}>
      <Routes>
        {role === 'superadmin' ? (
          <>
            <Route path="/" element={<SuperAdminDashboard />} />
            <Route path="/onboard-super" element={<OnboardSuperAdmin />} />
            <Route path="/onboard-admin" element={<OnboardAdmin />} />
          </>
        ) : (
          <>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/onboard-responder" element={<OnboardResponder />} />
          </>
        )}
      </Routes>
    </AdminLayout>
  )
}

function ProtectedFounder() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>
  }

  // Only an authorized account holding the founder role may enter.
  const isAuthorized =
    user && user.role === 'founder' && user.authorizationStatus === 'approved'

  if (!isAuthorized) {
    return <Navigate to={user ? homeForRole(user.role) : '/login'} replace />
  }

  return (
    <AdminLayout role="founder">
      <Routes>
        <Route path="/" element={<FoundersView />} />
      </Routes>
    </AdminLayout>
  )
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider defaultTheme="dark" storageKey="achiv-theme">
          <BrowserRouter>
            <AuthProvider>
              <LocationReporter />
              <AudioProvider>
                <Routes>
                  <Route path="/" element={<LandingView />} />
                  <Route path="/login" element={<AuthView />} />
                  <Route path="/app/*" element={<ProtectedApp />} />
                  <Route path="/authority" element={<ProtectedAuthority />} />
                  <Route path="/superadmin/*" element={<ProtectedAdmin role="superadmin" />} />
                  <Route path="/admin/*" element={<ProtectedAdmin role="admin" />} />
                  <Route path="/founder/*" element={<ProtectedFounder />} />
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
