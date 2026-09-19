import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';

const API_URL = `${import.meta.env.VITE_API_URL}/api/auth`;

const homeForRole = (role?: string): string => {
  switch (role) {
    case 'founder':
      return '/founder';
    case 'superadmin':
      return '/superadmin';
    case 'admin':
      return '/admin';
    case 'authority':
      return '/authority';
    default:
      return '/app';
  }
};

export const AuthView: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        // Firebase Login
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const token = await userCredential.user.getIdToken();
        
        // Sync with backend
        const response = await axios.post(`${API_URL}/login`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          login(response.data.user, token);
          navigate(homeForRole(response.data.user?.role), { replace: true });
        }
      } else {
        // Firebase Registration
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        const token = await userCredential.user.getIdToken();

        // Create user in backend
        const response = await axios.post(`${API_URL}/register`, 
          { name, email }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success) {
          login(response.data.user, token);
          navigate(homeForRole(response.data.user?.role), { replace: true });
        }
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      // Firebase auth errors or backend errors
      setError(err.response?.data?.message || err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async () => {
    setError('');
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const token = await userCredential.user.getIdToken();

      const response = await axios.post(`${API_URL}/google`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        login(response.data.user, token);
        navigate(homeForRole(response.data.user?.role), { replace: true });
      }
    } catch (err: any) {
      console.error('Google login failed', err);
      setError(err.response?.data?.message || err.message || 'Google login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex justify-center bg-black text-white overflow-hidden overscroll-none">
      <div className="relative w-full max-w-[480px] h-full flex flex-col items-center p-6 overflow-hidden bg-[#0A0A0A] border-x border-white/5">

        {/* iOS-style glowing ambient background */}
        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[50%] bg-gradient-to-b from-pink-500/20 to-transparent blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[120%] h-[50%] bg-gradient-to-t from-violet-500/20 to-transparent blur-[80px] pointer-events-none" />

        <div className="w-full flex-1 flex flex-col justify-center z-10 max-w-sm pb-10">

          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold tracking-tight text-white mb-2">
              ACHIV
            </h1>
            <p className="text-white/50 text-[15px] font-medium px-4">
              {isLogin ? 'Welcome back.' : 'Create your account.'}
            </p>
          </div>

          <div className="w-full bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[32px] p-6 shadow-2xl">
            <form onSubmit={handleSubmit} className="w-full space-y-4">
              {!isLogin && (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-[16px] text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50 focus:bg-black/60 transition-all"
                    required
                  />
                </div>
              )}

              <div className="relative">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-[16px] text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50 focus:bg-black/60 transition-all"
                  required
                />
              </div>

              <div className="relative">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-[16px] text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/50 focus:bg-black/60 transition-all"
                  required
                />
              </div>

              {error && (
                <div className="text-red-400 text-[13px] font-medium text-center bg-red-500/10 border border-red-500/20 py-2.5 px-4 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white text-black font-semibold text-[16px] py-4 rounded-full hover:bg-white/90 transition-colors active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : isLogin ? (
                  'Sign In'
                ) : (
                  'Sign Up'
                )}
              </button>
            </form>

            <div className="w-full flex items-center gap-4 my-6 opacity-60">
              <div className="flex-1 h-[1px] bg-white/10" />
              <span className="text-white text-[12px] font-medium tracking-wide">OR</span>
              <div className="flex-1 h-[1px] bg-white/10" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSuccess}
              disabled={isLoading}
              className="w-full bg-black/40 border border-white/10 text-white font-semibold text-[15px] py-3.5 rounded-full hover:bg-white/5 transition-colors active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {isLogin ? 'Sign in with Google' : 'Sign up with Google'}
            </button>
          </div>

          <div className="mt-8 text-center">
            <span className="text-white/50 text-[15px]">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </span>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-white ml-2 text-[15px] font-semibold active:opacity-70 transition-opacity"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
