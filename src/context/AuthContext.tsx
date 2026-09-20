import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import axios from 'axios';

export type UserRole = 'user' | 'authority' | 'admin' | 'superadmin' | 'founder';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  isAnonymous?: boolean;
  role?: UserRole;
  authorizationStatus?: 'pending' | 'approved' | 'rejected';
  specialization?: string;
  jurisdiction?: {
    country?: string;
    state?: string;
    lga?: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  unverifiedEmail: string | null;
  login: (userData: User, token: string) => void;
  updateUser: (userData: Partial<User>) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const API_URL = `${import.meta.env.API_URL}/api/auth`;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Email/password accounts are gated on email verification.
        // Until the email is verified the user is not "logged in" to the app.
        if (!firebaseUser.emailVerified) {
          setUnverifiedEmail(firebaseUser.email || null);
          setUser(null);
          setToken(null);
          localStorage.removeItem('achiv_token');
          localStorage.removeItem('achiv_user');
          setIsLoading(false);
          return;
        }
        setUnverifiedEmail(null);

        try {
          const authToken = await firebaseUser.getIdToken();
          setToken(authToken);
          localStorage.setItem('achiv_token', authToken);

          // Sync with backend to get role and extra profile data
          const response = await axios.get(`${API_URL}/me`, {
            headers: { Authorization: `Bearer ${authToken}` }
          });

          if (response.data.success) {
            setUser(response.data.user);
            localStorage.setItem('achiv_user', JSON.stringify(response.data.user));
          } else {
            setUser(null);
            setToken(null);
            localStorage.removeItem('achiv_token');
            localStorage.removeItem('achiv_user');
          }
        } catch (error) {
          console.error("Error syncing with backend:", error);
          setUser(null);
          setToken(null);
        }
      } else {
        setUnverifiedEmail(null);
        setUser(null);
        setToken(null);
        localStorage.removeItem('achiv_token');
        localStorage.removeItem('achiv_user');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('achiv_token', authToken);
    localStorage.setItem('achiv_user', JSON.stringify(userData));
  };

  const updateUser = (partial: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      localStorage.setItem('achiv_user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = async () => {
    await auth.signOut();
    setUser(null);
    setToken(null);
    localStorage.removeItem('achiv_token');
    localStorage.removeItem('achiv_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, unverifiedEmail, login, updateUser, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
