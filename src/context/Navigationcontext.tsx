/**
 * src/context/NavigationContext.tsx
 * Minimal context to allow deep screens to trigger top-level navigation.
 */
import React, { createContext, useContext, useRef, useCallback } from 'react';

type NavAction = 'ai-settings';

interface NavContextType {
  navigate: (action: NavAction) => void;
  setHandler: (handler: (action: NavAction) => void) => void;
}

const NavContext = createContext<NavContextType | null>(null);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const handlerRef = useRef<((action: NavAction) => void) | null>(null);

  const setHandler = useCallback((h: (action: NavAction) => void) => {
    handlerRef.current = h;
  }, []);

  const navigate = useCallback((action: NavAction) => {
    handlerRef.current?.(action);
  }, []);

  return (
    <NavContext.Provider value={{ navigate, setHandler }}>
      {children}
    </NavContext.Provider>
  );
};

export const useNavigation = () => {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNavigation must be used within NavigationProvider');
  return ctx;
};