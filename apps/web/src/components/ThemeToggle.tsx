import { useState } from 'react';

/** Light/dark switch — default light; persists to localStorage (mp-theme), paints data-theme. */
export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  return (
    <button
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="hover-shade ml-4 min-h-[44px] rounded-full border border-line px-3.5 py-2 text-sm text-muted transition"
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.dataset.theme = next ? 'dark' : 'light';
        try { localStorage.setItem('mp-theme', next ? 'dark' : 'light'); } catch { /* private mode */ }
      }}
    >
      {dark ? '☀' : '☾'}
    </button>
  );
}
