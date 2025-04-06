// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Scan all relevant files in src
  ],
  darkMode: 'class', // Enable dark mode using a class on the html/body tag
  theme: {
    extend: {
      // Add custom colors, fonts, etc. here if needed for the theme
      colors: {
        'sci-blue': '#00e1ff',
        'sci-green': '#39ff14',
        'sci-pink': '#ff33a8',
        'sci-yellow': '#ffe81a',
        'sci-red': '#ff3838',
        'sci-bg-dark': '#05080a',
        'sci-bg-dark-alt': '#0a0f14',
        'sci-border-dark': '#182029',
        'sci-text-dark': '#e0e0e0',
        'sci-text-dark-secondary': '#7d8c9a',
        // Add light theme equivalents
        'sci-bg-light': '#f6f8fa',
        'sci-bg-light-alt': '#ffffff',
        'sci-border-light': '#d0d7de',
        'sci-text-light': '#1f2328',
        'sci-text-light-secondary': '#636c76',
      },
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      boxShadow: {
         'sci-dark': '0 2px 8px rgba(0, 0, 0, 0.5)',
         'sci-light': '0 1px 4px rgba(0, 0, 0, 0.1)',
      },
      // Add animation/keyframes if desired
    },
  },
  plugins: [],
}