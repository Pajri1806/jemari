import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

const ThemeContext = createContext<{
    theme: Theme
    setTheme: (t: Theme) => void
    toggle: () => void
}>({
    theme: 'dark',
    setTheme: () => {},
    toggle: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        if (typeof window === 'undefined') return 'dark'
        try {
            const stored = localStorage.getItem('theme')
            if (stored) return JSON.parse(stored) as Theme
        } catch {}
        return 'dark'
    })

    useEffect(() => {
        const root = document.documentElement
        root.classList.remove('light', 'dark')
        root.classList.add(theme)
        localStorage.setItem('theme', JSON.stringify(theme))
    }, [theme])

    const setTheme = (t: Theme) => setThemeState(t)
    const toggle = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'))

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    return useContext(ThemeContext)
}
