/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: '#070a0f',
          surface: '#0d1117',
          elevated: '#121820',
          border: '#1e2632',
          accent: '#58a6ff',
          mint: '#3fb950',
          violet: '#a371f7',
          amber: '#d29922',
          danger: '#f85149',
          muted: '#8b949e',
          glow: '#388bfd',
        },
      },
      fontFamily: {
        mono: ['SpaceMono', 'monospace'],
      },
    },
  },
  plugins: [],
};
