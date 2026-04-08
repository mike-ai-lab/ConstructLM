import { useState, useEffect } from 'react';
import { sessionPersistence } from '../services/sessionPersistence';

export type Theme = 'light' | 'dark';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Load from localStorage first (primary source)
    const saved = localStorage.getItem('theme');
    if (saved) return saved as Theme;
    
    // Fallback to session persistence
    const session = sessionPersistence.loadSession();
    if (session.theme) return session.theme;
    
    return 'light';
  });

  useEffect(() => {
    // Apply theme immediately on mount
    document.documentElement.classList.toggle('dark', theme === 'dark');
    
    // Save to both storage systems
    localStorage.setItem('theme', theme);
    sessionPersistence.saveSession({ theme });
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return { theme, toggleTheme };
};
