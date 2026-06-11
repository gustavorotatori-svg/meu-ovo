import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    try {
      const saved = localStorage.getItem('theme') as Theme | null;
      if (saved) return saved;
    } catch {
      // localStorage pode falhar em modo privado no mobile
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // localStorage pode falhar em modo privado no mobile
    }
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
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
      toggleTheme: ctx.toggleTheme
    };
  }
  
  return ctx;
}
