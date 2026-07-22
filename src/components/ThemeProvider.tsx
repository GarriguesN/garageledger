'use client';

import { createContext, useContext } from 'react';

const ThemeCtx = createContext<{ theme: string }>({ theme: 'light' });

export const useTheme = () => useContext(ThemeCtx);

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeCtx.Provider value={{ theme: 'light' }}>
      {children}
    </ThemeCtx.Provider>
  );
}
