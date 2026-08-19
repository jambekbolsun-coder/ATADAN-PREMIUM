import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        atadan: {
          50: '#f3ffe8', 100: '#e2ffc7', 200: '#c6ff95', 300: '#9bff57', 400: '#72ef1f',
          500: '#58d000', 600: '#43a600', 700: '#347e05', 800: '#2c630a', 900: '#26530d'
        }
      },
      boxShadow: { soft: '0 18px 60px rgba(21,48,8,.10)' },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: []
} satisfies Config
