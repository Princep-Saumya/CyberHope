import {
  createContext,
  useContext,
  useState,
} from 'react';
import { DEMO_ACCOUNTS } from '../auth/demoAccounts';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [demoProfile, setDemoProfile] = useState(null);

  async function signIn(email, password) {
    const profile = DEMO_ACCOUNTS.find(account =>
      account.email.toLowerCase() === email.trim().toLowerCase()
      && account.password === password
    );
    if (!profile) return 'Demo sign-in failed. Choose a listed profile and use its displayed password.';
    setDemoProfile(profile);
    return null;
  }

  const demoMode = Boolean(demoProfile);

  return (
    <AuthContext.Provider
      value={{
        demoProfile,
        demoMode,
        isAuthenticated: demoMode,
        loading: false,
        signIn,
        signOut: async () => {
          setDemoProfile(null);
          return null;
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
