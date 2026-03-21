import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('primary');

  const themes = {
    primary: {
      primary: 'bg-primary-500',
      secondary: 'bg-primary-600',
      text: 'text-primary-600',
      hover: 'hover:bg-primary-600',
      button: 'bg-primary-500 hover:bg-primary-600',
      accent: 'bg-amber-400',
    },
    violet: {
      primary: 'bg-violet-500',
      secondary: 'bg-violet-600',
      text: 'text-violet-600',
      hover: 'hover:bg-violet-600',
      button: 'bg-violet-500 hover:bg-violet-600',
      accent: 'bg-purple-300',
    },
    blue: {
      primary: 'bg-blue-500',
      secondary: 'bg-blue-600',
      text: 'text-blue-600',
      hover: 'hover:bg-blue-600',
      button: 'bg-blue-500 hover:bg-blue-600',
      accent: 'bg-blue-300',
    },
  };

  const toggleTheme = (newTheme) => {
    if (themes[newTheme]) {
      setTheme(newTheme);
      localStorage.setItem('feedoTheme', newTheme);
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('feedoTheme');
    if (savedTheme && themes[savedTheme]) {
      setTheme(savedTheme);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ currentTheme: themes[theme], theme, toggleTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};
