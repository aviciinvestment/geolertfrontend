import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'user' | 'authority' | 'admin' | 'superadmin';

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
  login: (userData: User, token: string) => void;
  updateUser: (userData: Partial<User>) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('achiv_token');
    const storedUser = localStorage.getItem('achiv_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
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

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('achiv_token');
    localStorage.removeItem('achiv_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, updateUser, logout, isLoading }}>
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
