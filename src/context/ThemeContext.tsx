import { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';

type Theme = 'light' | 'dark';
type ThemePreference = 'auto' | 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function getAutoTheme(): Theme {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? 'light' : 'dark';
}

function getStoredPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem('theme-preference') as ThemePreference | null;
    if (saved === 'light' || saved === 'dark' || saved === 'auto') return saved;
  } catch {}
  return 'auto';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(getStoredPreference);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const autoTheme = useMemo(() => getAutoTheme(), [now]);

  const resolvedTheme: Theme = preference === 'auto' ? autoTheme : preference;

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p);
    try {
      localStorage.setItem('theme-preference', p);
    } catch {}
  };

  const toggleTheme = () => {
    const next = resolvedTheme === 'light' ? 'dark' : 'light';
    setPreference(next);
  };

  return (
    <ThemeContext.Provider value={{ theme: resolvedTheme, preference, setPreference, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');

  const isAdminPath = typeof window !== 'undefined' && 
    (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/plataforma'));

  if (isAdminPath) {
    return {
      theme: 'dark' as const,
      preference: ctx.preference,
      setPreference: ctx.setPreference,
      toggleTheme: ctx.toggleTheme
    };
  }

  return ctx;
}
