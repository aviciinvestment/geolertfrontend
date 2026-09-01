import React, { useState } from 'react';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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
      const endpoint = isLogin ? '/login' : '/register';
      const payload = isLogin ? { email, password } : { name, email, password };

      const response = await axios.post(`${API_URL}${endpoint}`, payload);

      if (response.data.success) {
        login(response.data.user, response.data.token);
        navigate(homeForRole(response.data.user?.role), { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const response = await axios.post(`${API_URL}/google`, {
        credential: credentialResponse.credential,
      });

      if (response.data.success) {
        login(response.data.user, response.data.token);
        navigate(homeForRole(response.data.user?.role), { replace: true });
      }
    } catch (err) {
      console.error('Google login failed', err);
      setError('Google login failed. Please try again.');
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

            <div className="w-full flex justify-center [&>div]:w-full overflow-hidden rounded-full">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Login Failed')}
                theme="filled_black"
                shape="pill"
                text={isLogin ? 'signin_with' : 'signup_with'}
                width="100%"
                size="large"
              />
            </div>
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
