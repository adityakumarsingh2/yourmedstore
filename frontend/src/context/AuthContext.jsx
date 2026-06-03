import { createContext, useContext, useMemo, useState } from 'react';
import { apiRequest } from '../lib/api.js';

const AuthContext = createContext(null);
const storageKey = 'yourMedStoreAuth';

function readStoredSession() {
  try {
    const rawSession = localStorage.getItem(storageKey);
    return rawSession ? JSON.parse(rawSession) : { token: null, user: null };
  } catch (error) {
    localStorage.removeItem(storageKey);
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);

  async function login(email, password) {
    const nextSession = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    localStorage.setItem(storageKey, JSON.stringify(nextSession));
    setSession(nextSession);
    return nextSession;
  }

  function logout() {
    localStorage.removeItem(storageKey);
    setSession({ token: null, user: null });
  }

  const value = useMemo(() => ({
    isAuthenticated: Boolean(session.token),
    token: session.token,
    user: session.user,
    login,
    logout
  }), [session]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
