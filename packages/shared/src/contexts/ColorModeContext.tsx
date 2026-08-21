import React, { createContext, useContext, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { lightTheme } from '../theme';

export type ColorMode = 'light';

interface ColorModeContextType {
  mode: ColorMode;
  toggleColorMode: () => void;
  setColorMode: (mode: ColorMode) => void;
}

const ColorModeContext = createContext<ColorModeContextType>({
  mode: 'light',
  toggleColorMode: () => {},
  setColorMode: () => {},
});

export const useColorMode = () => useContext(ColorModeContext);

export const ColorModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    localStorage.setItem('themeMode', 'light');
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.style.backgroundColor = '#f8fafc';
    document.body.style.color = '#0f172a';
  }, []);

  const toggleColorMode = () => {};
  const setColorMode = () => {};

  return (
    <ColorModeContext.Provider value={{ mode: 'light', toggleColorMode, setColorMode }}>
      <ThemeProvider theme={lightTheme}>
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};

