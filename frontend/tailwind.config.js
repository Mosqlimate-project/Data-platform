/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        text: 'var(--color-text)',
        border: 'var(--color-border)',
        accent: 'var(--color-accent)',
      },
    },
  },
  darkMode: 'class',
};
