'use client';
import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from 'react';

type Theme = 'light' | 'dark';

interface ThemeCtx {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeCtx>({
    theme: 'light',
    toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>('light');

    useEffect(() => {
        const stored = localStorage.getItem('theme') as Theme | null;
        const initial = stored === 'dark' ? 'dark' : 'light';
        setTheme(initial);
        document.documentElement.setAttribute('data-theme', initial);
    }, []);

    const toggleTheme = () => {
        const next: Theme = theme === 'light' ? 'dark' : 'light';
        setTheme(next);
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
