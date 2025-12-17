'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

export default function Footer() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <footer
      className={clsx(
        "border-t w-full p-6 text-center border-[var(--color-border)] text-[var(--color-text)] flex justify-center items-center gap-4 transition-colors",
        pathname === '/' ? "bg-[var(--color-bg-home)]" : "bg-[var(--color-bg)]"
      )}
    >
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="flex items-center gap-2 px-4 py-2 rounded-md hover:bg-[var(--color-hover)] transition-colors text-sm font-medium"
      >
        <span>Theme </span>
        {theme === 'light' ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 18a6 6 0 100-12 6 6 0 000 12z" />
            <path fillRule="evenodd" d="M12 2a.75.75 0 01.75.75V5a.75.75 0 01-1.5 0V2.75A.75.75 0 0112 2zm0 16a.75.75 0 01.75.75V22a.75.75 0 01-1.5 0v-3.25A.75.75 0 0112 18zm10-6a.75.75 0 01-.75.75H18a.75.75 0 010-1.5h3.25A.75.75 0 0122 12zm-16 0a.75.75 0 01-.75.75H2a.75.75 0 010-1.5h3.25A.75.75 0 016 12zm13.03-7.78a.75.75 0 010 1.06L17.06 7.25a.75.75 0 01-1.06-1.06l1.97-1.97a.75.75 0 011.06 0zm-10.06 10.06a.75.75 0 010 1.06L7 17.97a.75.75 0 01-1.06-1.06l1.97-1.97a.75.75 0 011.06 0zm10.06 1.06a.75.75 0 010 1.06l-1.97 1.97a.75.75 0 11-1.06-1.06l1.97-1.97a.75.75 0 011.06 0zM7 6.03a.75.75 0 010 1.06L5.03 9.06A.75.75 0 013.97 8l1.97-1.97A.75.75 0 017 6.03z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mb-1 text-gray-800 dark:text-gray-200" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M17.293 15.293A8 8 0 118.707 6.707a6.5 6.5 0 108.586 8.586z" clipRule="evenodd" />
          </svg>
        )}
      </button>
    </footer>
  );
}
