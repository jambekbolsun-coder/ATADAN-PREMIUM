import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        atadan: {
          50: '#eef6ef', 100: '#dcebdd', 200: '#bdd9bf', 300: '#9bc89e', 400: '#a8e37a',
          500: '#8ed957', 600: '#3f8d59', 700: '#276440', 800: '#17472f', 900: '#0b2b1d'
        }
      },
      boxShadow: { soft: '0 24px 70px rgba(5,29,18,.14)' },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: []
} satisfies Config
